module.exports = {
	log: "../page-mirror-server.log",
	assets: {
		log: "../page-mirror-assets.log",
		stream: {
			region: "us-east-1",
			name: "recordings-assets"
		},
		bucket: "echo-reflect-dev-assets",
		check_interval: 60000,
		broken_check_interval: 120000,
		head_timeout: 10000,
		timeout: 20000,
		blacklist: [
			//".*secure.adnxs.com.*"
		],
		host_timeout_threshold: 3,
		host_timeout_retry_period: 300000
	},
	db: {
		host: "localhost",
		database: "recordings"
	}
};