'use strict';

const config = require('../config');
const got = require('got');
const semver = require('semver');
const Cache = require('mahsan');
const cache = new Cache();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get package info from npm registry.
 * @param {string} name
 * @param {number} [attempts] - The number of attempts before throwing error.
 * @return {Promise<object>}
 */
async function getInfo(name, attempts = 2) {
  if (await cache.has(name)) {
    return await cache.get(name);
  }

  let response;

  try {
    response = await got(`${config.npmRegistryUrl}/${name}`, { json: true });
  } catch (err) {
    if (attempts > 0) {
      return getInfo(name, attempts - 1);
    } else {
      throw err;
    }
  }

  await cache.set(name, response.body, CACHE_TTL);

  return response.body;
}

/**
 * Find suitable version by semver-based version string. Return the last
 * version by default.
 * @param {object} packageInfo
 * @param {string} [versionString]
 * @return {string}
 */
function resolveVersion(packageInfo, versionString) {
  if (packageInfo['dist-tags'] && packageInfo['dist-tags'][versionString]) {
    return packageInfo['dist-tags'][versionString];
  }

  // List of available versions sorted from newest version to oldest.
  const availableVersions = Object.keys(packageInfo.versions || {}).reverse();

  if (versionString) {
    return availableVersions.find(version =>
      semver.satisfies(version, versionString)
    );
  } else {
    return availableVersions[0];
  }
}

/**
 * Check if we have same package up the tree.
 * @param {string} name
 * @param {string} version
 * @param {object} [parent]
 * @return {boolean}
 */
function isCircular(name, version, parent) {
  if (!parent) {
    return false;
  }
  if (parent.name === name && parent.version === version) {
    return true;
  }
  return isCircular(name, version, parent.parent);
}

/**
 * Cleanup all items of the tree from `parent` field to make it serializable to
 * JSON.
 * @param {object} node
 * @return {object}
 */
function cleanupTree(node) {
  delete node.parent;
  node.dependencies = node.dependencies.map(cleanupTree);
  return node;
}

/**
 * Sort tree by number of dependencies.
 * @param {object} node
 * @return {object}
 */
function sortTree(node) {
  node.dependencies = node.dependencies.sort(
    (a, b) => b.dependencies.length - a.dependencies.length
  );
  return node;
}

/**
 * Get tree for the package by name and version.
 * @param {string} name
 * @param {string} [versionString]
 * @param {object} [parent]
 * @return {Promise<{name: string, version: string, dependencies: Array, parent: object, circular: boolean}>}
 */
async function getDependencyTree(name, versionString, parent = null) {
  const packageInfo = await getInfo(name);
  const version = resolveVersion(packageInfo, versionString);
  const result = {
    name,
    version,
    dependencies: [],
    parent,
    circular: isCircular(name, version, parent)
  };

  if (result.circular) {
    return result;
  }

  // In case if `versionString` is repository URL or local path.
  // See: https://docs.npmjs.com/files/package.json#dependencies
  if (!version) {
    result.version = versionString;
    return result;
  }

  const dependencies = Object.entries(
    packageInfo.versions[version].dependencies || {}
  );

  result.dependencies = await Promise.all(
    dependencies.map(([name, versionString]) =>
      getDependencyTree(name, versionString, result)
    )
  );

  if (parent) {
    return sortTree(result);
  } else {
    return sortTree(cleanupTree(result));
  }
}

module.exports = {
  getDependencyTree
};
