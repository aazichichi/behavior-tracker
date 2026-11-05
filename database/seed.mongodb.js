// =============================================================================
//  Behavior Tracker — MongoDB setup + seed script
//  Database: BehaviorTracker
//
//  Run it ONE of these ways:
//    A) Terminal (recommended):
//         mongosh "mongodb+srv://USER:PASS@YOUR-CLUSTER.mongodb.net/" --file seed.mongodb.js
//    B) MongoDB Compass: click ">_ Open MongoDB shell", then paste this whole file and press Enter.
//    C) VS Code + "MongoDB for VS Code" extension: open this file and click "Run All" (Playground).
//
//  !! WARNING: this DROPS and recreates all 5 collections. Run it once to set
//  !! things up. Do NOT run it again after the app has real data in it.
//
//  Demo logins (all passwords are: Password123!)
//    jrivera  (teacher, verified)
//    achen    (teacher, verified)
//    spatel   (parent,  NOT verified — shows the email-verification fields)
// =============================================================================

db = db.getSiblingDB("BehaviorTracker");
print("Using database: " + db.getName());

// ---------------------------------------------------------------------------
// 1) COLLECTIONS WITH SCHEMA VALIDATION
//    $jsonSchema makes MongoDB reject any document that is missing a field or
//    has the wrong type, so every document in a collection has the same shape.
// ---------------------------------------------------------------------------
const collections = ["behaviorEvents", "sessions", "behaviors", "students", "users"];
collections.forEach((c) => { if (db.getCollectionNames().includes(c)) { db.getCollection(c).drop(); print("Dropped " + c); } });

const STR = { bsonType: "string" };
const STR_OR_NULL = { bsonType: ["string", "null"] };
const DATE = { bsonType: "date" };
const DATE_OR_NULL = { bsonType: ["date", "null"] };
const OID = { bsonType: "objectId" };
const BOOL = { bsonType: "bool" };
const INT = { bsonType: ["int", "long", "double"], minimum: 0 };

function create(name, required, properties) {
  db.createCollection(name, {
    validator: { $jsonSchema: { bsonType: "object", required: required, properties: properties } },
    validationLevel: "strict",
    validationAction: "error",
  });
  print("Created " + name);
}

create("users",
  ["firstName", "lastName", "email", "login", "password", "role", "isVerified",
   "verificationToken", "resetPasswordToken", "resetPasswordExpires", "dateCreated", "dateUpdated"],
  {
    _id: OID,
    firstName: STR,
    lastName: STR,
    email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
    login: STR,
    password: { bsonType: "string", description: "bcrypt hash, never plain text" },
    role: { enum: ["teacher", "parent"] },
    isVerified: BOOL,
    verificationToken: STR_OR_NULL,
    resetPasswordToken: STR_OR_NULL,
    resetPasswordExpires: DATE_OR_NULL,
    dateCreated: DATE,
    dateUpdated: DATE,
  });

create("students",
  ["userId", "firstName", "lastName", "gradeLevel", "notes", "dateCreated", "dateUpdated"],
  {
    _id: OID,
    userId: { bsonType: "objectId", description: "FK -> users._id (who owns this student)" },
    firstName: STR,
    lastName: STR,
    gradeLevel: STR,
    notes: STR,
    dateCreated: DATE,
    dateUpdated: DATE,
  });

create("behaviors",
  ["studentId", "userId", "name", "code", "description", "color", "isArchived", "dateCreated", "dateUpdated"],
  {
    _id: OID,
    studentId: { bsonType: "objectId", description: "FK -> students._id" },
    userId: { bsonType: "objectId", description: "FK -> users._id" },
    name: STR,
    code: { bsonType: "string", pattern: "^[A-Z]$", description: "single capital letter shown on the chart" },
    description: STR,
    color: { bsonType: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    isArchived: BOOL,
    dateCreated: DATE,
    dateUpdated: DATE,
  });

create("sessions",
  ["userId", "studentId", "startTime", "endTime", "intervalSeconds", "status", "notes", "dateCreated", "dateUpdated"],
  {
    _id: OID,
    userId: { bsonType: "objectId", description: "FK -> users._id" },
    studentId: { bsonType: "objectId", description: "FK -> students._id" },
    startTime: DATE,
    endTime: { bsonType: ["date", "null"], description: "null while the session is still running" },
    intervalSeconds: INT,
    status: { enum: ["active", "ended"] },
    notes: STR,
    dateCreated: DATE,
    dateUpdated: DATE,
  });

create("behaviorEvents",
  ["sessionId", "studentId", "behaviorId", "userId", "timestamp", "intervalIndex"],
  {
    _id: OID,
    sessionId: { bsonType: "objectId", description: "FK -> sessions._id" },
    studentId: { bsonType: "objectId", description: "FK -> students._id" },
    behaviorId: { bsonType: "objectId", description: "FK -> behaviors._id" },
    userId: { bsonType: "objectId", description: "FK -> users._id" },
    timestamp: DATE,
    intervalIndex: { bsonType: ["int", "long", "double"], minimum: 0, description: "floor((timestamp - session.startTime) / intervalSeconds)" },
  });

// ---------------------------------------------------------------------------
// 2) INDEXES (fast lookups + uniqueness rules)
// ---------------------------------------------------------------------------
db.users.createIndex({ login: 1 }, { unique: true, name: "uniq_login" });
db.users.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });
db.students.createIndex({ userId: 1, lastName: 1, firstName: 1 }, { name: "by_owner" });
// A letter can only be used once per student (archived behaviors free the letter up)
db.behaviors.createIndex({ studentId: 1, code: 1 }, { unique: true, partialFilterExpression: { isArchived: false }, name: "uniq_code_per_student" });
db.sessions.createIndex({ studentId: 1, startTime: -1 }, { name: "student_history" });
db.sessions.createIndex({ userId: 1, status: 1 }, { name: "by_owner_status" });
db.behaviorEvents.createIndex({ sessionId: 1, timestamp: 1 }, { name: "session_timeline" });
db.behaviorEvents.createIndex({ studentId: 1, behaviorId: 1, timestamp: -1 }, { name: "student_trends" });
print("Indexes created");

// ---------------------------------------------------------------------------
// 3) SAMPLE DATA (fixed ObjectIds so every foreign key points at a real document)
// ---------------------------------------------------------------------------

print("Inserting Users...");
db.users.insertMany([
  { _id: ObjectId("6ad0dc600001000000000001"), firstName: "Jordan", lastName: "Rivera", email: "jordan.rivera@example.com", login: "jrivera", password: "$2b$10$mNXdaPZ4aThtSB8MhwQGAe8DvwwRe5MySFDsf77WVCu2oZn7pMBfW", role: "teacher", isVerified: true, verificationToken: null, resetPasswordToken: null, resetPasswordExpires: null, dateCreated: ISODate("2026-10-15T14:00:00.000Z"), dateUpdated: ISODate("2026-10-15T14:00:00.000Z") },
  { _id: ObjectId("6ad0ea700001000000000002"), firstName: "Avery", lastName: "Chen", email: "avery.chen@example.com", login: "achen", password: "$2b$10$wyeiV44OTUtIND897EHmAOwF35gjDO5wFNJe0IFz7oicheT.Mse96", role: "teacher", isVerified: true, verificationToken: null, resetPasswordToken: null, resetPasswordExpires: null, dateCreated: ISODate("2026-10-15T15:00:00.000Z"), dateUpdated: ISODate("2026-10-15T15:00:00.000Z") },
  { _id: ObjectId("6ad0f8800001000000000003"), firstName: "Sam", lastName: "Patel", email: "sam.patel@example.com", login: "spatel", password: "$2b$10$cwA5lYdBl4UCEZUxUb5MROPU39ZrY813TNujiKzsHMjiVF7taweja", role: "parent", isVerified: false, verificationToken: "a3f9c2e1b7d84f60a1c5e9b2d7f3a8c4", resetPasswordToken: null, resetPasswordExpires: null, dateCreated: ISODate("2026-10-15T16:00:00.000Z"), dateUpdated: ISODate("2026-10-15T16:00:00.000Z") }
]);

print("Inserting Students...");
db.students.insertMany([
  { _id: ObjectId("6ad21fd00002000000000001"), userId: ObjectId("6ad0dc600001000000000001"), firstName: "Mia", lastName: "Thompson", gradeLevel: "2", notes: "Prefers visual schedules. Break card on desk.", dateCreated: ISODate("2026-10-16T13:00:00.000Z"), dateUpdated: ISODate("2026-10-16T13:00:00.000Z") },
  { _id: ObjectId("6ad222280002000000000002"), userId: ObjectId("6ad0dc600001000000000001"), firstName: "Leo", lastName: "Garcia", gradeLevel: "3", notes: "Token board: 5 tokens = 2 min iPad.", dateCreated: ISODate("2026-10-16T13:00:00.000Z"), dateUpdated: ISODate("2026-10-16T13:00:00.000Z") }
]);
