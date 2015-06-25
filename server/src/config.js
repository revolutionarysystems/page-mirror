module.exports = {
	protocol: "http",
	ssl: {
		key: "",
		cert: "",
		ca: ""
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