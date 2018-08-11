'use strict';

const Vue = require('vue/dist/vue');
const VueResource = require('vue-resource/dist/vue-resource');

Vue.use(VueResource);

Vue.component('dependencies-tree', {
  template: '#dependencies-tree',
  props: ['dependencies', 'depth'],
  data() {
    return { shown: [] };
  },
  methods: {
    toggle(dependency) {
      if (this.shown.includes(dependency)) {
        this.shown.splice(this.shown.indexOf(dependency), 1);
      } else {
        this.shown.push(dependency);
      }
    }
  }
});

new Vue({
  el: '.content',
  data: {
    packageName: '',
    packageVersion: '',
    isError: false,
    isLoading: false,
    tree: null
  },
  methods: {
    requestTree() {
      this.isLoading = true;
      this.isError = false;
      this.tree = null;

      this.$http
        .get(`/npm/${this.packageName}?version=${this.packageVersion}`)
        .then(response => {
          if (response.ok) {
            this.tree = response.body;
          } else {
            throw response;
          }
        })
        .catch(err => {
          this.isError = true;
          console.error(err);
        })
        .then(() => {
          this.isLoading = false;
        });
    }
  }
});
