module.exports = {
	port: 8070,
	db: {
		type:"memory",
		host:"localhost",
		database:"recordedSessions",
		tables:{
			recordings: "recordings",
			blacklist: "blacklist"
		}
	}
};