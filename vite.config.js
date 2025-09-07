export default {
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        editor: "editor.html",
      },
      treeshake: false,
    },
    minify: "terser",
    terserOptions: {
      mangle: false, 
      format: {
        comments: false, 
      },
    },
  },
};
