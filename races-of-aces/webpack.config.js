const path = require('path');

module.exports = {
    entry: './index.mjs',
    mode: "production",
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'static', 'src'),
    },
};
