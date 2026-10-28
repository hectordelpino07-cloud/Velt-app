// Añade la ruta base solo al publicar en GitHub Pages (https://usuario.github.io/Velt-app/).
// En local no se define EXPO_BASE_URL y la app sigue abriéndose en localhost:8081.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
