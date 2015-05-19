module.exports = {
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