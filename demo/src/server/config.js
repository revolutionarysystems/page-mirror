module.exports = {
	port: 8070,
	db: {
		type:"mongo",
		host:"localhost",
		database:"recordedSessions",
		tables:{
			recordings: "recordings",
			blacklist: "blacklist"
		}
	}
};