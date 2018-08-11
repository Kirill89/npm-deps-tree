'use strict';

const assert = require('assert');
const proxyquire = require('proxyquire');

describe('npm', () => {
  it('should not fail in case of circular dependency', async () => {
    const npm = proxyquire('../lib/npm', {
      got: async url => {
        if (url.includes('foo')) {
          return {
            body: { versions: { '1.1.1': { dependencies: { bar: '1.1.1' } } } }
          };
        } else if (url.includes('bar')) {
          return {
            body: { versions: { '1.1.1': { dependencies: { foo: '1.1.1' } } } }
          };
        }
      }
    });

    const result = await npm.getDependencyTree('foo');

    assert.deepStrictEqual(result, {
      name: 'foo',
      version: '1.1.1',
      dependencies: [
        {
          name: 'bar',
          version: '1.1.1',
          dependencies: [
            {
              name: 'foo',
              version: '1.1.1',
              dependencies: [],
              circular: true
            }
          ],
          circular: false
        }
      ],
      circular: false
    });
  });

  it('should handle dist-tags', async () => {
    const npm = proxyquire('../lib/npm', {
      got: async () => {
        return {
          body: {
            'dist-tags': { test: '1.1.1' },
            versions: {
              '1.1.1': {},
              '2.2.2': {}
            }
          }
        };
      }
    });

    const result = await npm.getDependencyTree('foo', 'test');

    assert.deepStrictEqual(result, {
      name: 'foo',
      version: '1.1.1',
      dependencies: [],
      circular: false
    });
  });

  it('should return empty dependencies list if version is repository url', async () => {
    const npm = proxyquire('../lib/npm', {
      got: async () => {
        return {
          body: {
            versions: {
              '1.1.1': { dependencies: {} }
            }
          }
        };
      }
    });

    const result = await npm.getDependencyTree('foo', 'git+blabla');

    assert.deepStrictEqual(result, {
      name: 'foo',
      version: 'git+blabla',
      dependencies: [],
      parent: null,
      circular: false
    });
  });

  it('should sort dependencies by count', async () => {
    const npm = proxyquire('../lib/npm', {
      got: async url => {
        if (url.includes('foo')) {
          return {
            body: {
              versions: {
                '1.1.1': { dependencies: { bar: '1.1.1', baz: '1.1.1' } }
              }
            }
          };
        } else if (url.includes('bar')) {
          return {
            body: { versions: { '1.1.1': { dependencies: { foo: '1.1.1' } } } }
          };
        } else if (url.includes('baz')) {
          return {
            body: {
              versions: {
                '1.1.1': { dependencies: { foo: '1.1.1', bar: '1.1.1' } }
              }
            }
          };
        }
      }
    });

    const result = await npm.getDependencyTree('foo');

    assert.deepStrictEqual(result, {
      name: 'foo',
      version: '1.1.1',
      dependencies: [
        {
          name: 'baz',
          version: '1.1.1',
          dependencies: [
            {
              name: 'bar',
              version: '1.1.1',
              dependencies: [
                {
                  name: 'foo',
                  version: '1.1.1',
                  dependencies: [],
                  circular: true
                }
              ],
              circular: false
            },
            {
              name: 'foo',
              version: '1.1.1',
              dependencies: [],
              circular: true
            }
          ],
          circular: false
        },
        {
          name: 'bar',
          version: '1.1.1',
          dependencies: [
            {
              name: 'foo',
              version: '1.1.1',
              dependencies: [],
              circular: true
            }
          ],
          circular: false
        }
      ],
      circular: false
    });
  });

  it('should do multiple attempts in case of network error', async () => {
    let count = 0;
    const npm = proxyquire('../lib/npm', {
      got: async () => {
        count++;
        throw new Error();
      }
    });

    try {
      await npm.getDependencyTree('foo');
    } catch (e) {
      assert.strictEqual(count, 3);
    }
  });

  it('should use cache', async () => {
    let count = 0;
    const npm = proxyquire('../lib/npm', {
      got: async () => {
        count++;
        return {
          body: {}
        };
      }
    });

    await npm.getDependencyTree('foo');
    await npm.getDependencyTree('foo');
    await npm.getDependencyTree('foo');

    assert.strictEqual(count, 1);
  });
});
