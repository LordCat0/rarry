export default {
  build: {
    minify: false, 
    rollupOptions: {
      input: {
        main: "index.html",
        editor: "editor.html",
      },
      treeshake: false,
    },
  },
};
