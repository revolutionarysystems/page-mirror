module.exports = {
	protocol: "http",
	ssl: {
		key: "",
		cert: "",
		ca: ""
	},
	port: 8070,
	db: {
		type:"memory",
		host:"localhost",
		database:"recordings",
		tables:{
			recordings: "recordings",
			blacklist: "blacklist"
		}
	}
};