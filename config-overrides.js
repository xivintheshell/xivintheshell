// https://github.com/wmonk/create-react-app-typescript/issues/337
// https://stackoverflow.com/questions/63280109/how-to-update-webpack-config-for-a-react-project-created-using-create-react-app

/* config-overrides.js */
module.exports = {
	webpack: function (config, env) {
		config.module.rules = [
			...config.module.rules,
			{
				test: /\.(png|jpe?g|gif)$/i,
				type: "asset/resource",
			},
		];
		return config;
	},
};
