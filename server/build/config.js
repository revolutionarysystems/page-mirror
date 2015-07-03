module.exports = {
	assets:{
		bucket: "echo-reflect-dev-assets",
		check_interval: 60000,
		broken_check_interval: 120000
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