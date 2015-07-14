module.exports = {
	log: "../page-mirror-server.log",
	assets:{
		bucket: "echo-reflect-dev-assets",
		check_interval: 10000,
		broken_check_interval: 10000
	},
	db: {
		host:"localhost",
		database:"recordings",
		tables:{
			recordings: "recordings",
			blacklist: "blacklist"
		}
	}
};