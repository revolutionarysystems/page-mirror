module.exports = {
	protocol: "http",
	ssl: {
		key: "",
		cert: "",
		ca: ""
	},
	assets:{
		bucket: "echo-reflect-dev-assets",
		check_interval: 60000,
		broken_check_interval: 120000
	},
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