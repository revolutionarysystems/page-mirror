module.exports = {
	protocol: "http",
	ssl: {
		key: "",
		cert: "",
		ca: ""
	},
	asset_bucket: "echo-reflect-dev-assets",
	port: 8070,
	db: {
		host:"localhost",
		database:"recordings",
		tables:{
			recordings: "recordings",
			blacklist: "blacklist"
		}
	}
};