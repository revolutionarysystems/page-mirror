module.exports = {
	log: "../page-mirror-server.log",
	assets:{
		bucket: "echo-reflect-dev-assets",
		check_interval: 10000,
		broken_check_interval: 10000,
		head_timeout: 10000,
		timeout: 20000,
		blacklist: [
			//".*secure.adnxs.com.*"
		],
		host_timeout_threshold: 3,
		host_timeout_retry_period: 60000
	},
	db: {
		host:"localhost",
		database:"recordings"
	}
};