export default {
    search: require('qs').parse(window.location.search.slice(1)),
    stringify: require('qs').stringify.bind(require('qs')),
};