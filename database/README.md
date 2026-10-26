# Database setup

The database is **MongoDB Atlas** (free M0 cluster). Database name: `BehaviorTracker`.

| File | Use |
| --- | --- |
| `seed.mongodb.js` | Creates the 5 collections with schema validation + indexes and loads sample data |
| `json/*.json` | Same sample data for MongoDB Compass → Add Data → Import JSON |

Run the seed script (it **drops and recreates** the collections, so never run it once there is real data):

```
mongosh "mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/" --file database/seed.mongodb.js
```

Demo logins: `jrivera`, `achen` (teachers), `spatel` (parent, unverified). Password for all: `Password123!`
All names in the sample data are made up. Never put real student information in this database.
