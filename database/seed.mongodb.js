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
const collections = ["BehaviorEvents", "Sessions", "Behaviors", "Students", "Users"];
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

create("Users",
  ["FirstName", "LastName", "Email", "Login", "Password", "Role", "IsVerified",
   "VerificationToken", "ResetPasswordToken", "ResetPasswordExpires", "DateCreated", "DateUpdated"],
  {
    _id: OID,
    FirstName: STR,
    LastName: STR,
    Email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
    Login: STR,
    Password: { bsonType: "string", description: "bcrypt hash, never plain text" },
    Role: { enum: ["teacher", "parent"] },
    IsVerified: BOOL,
    VerificationToken: STR_OR_NULL,
    ResetPasswordToken: STR_OR_NULL,
    ResetPasswordExpires: DATE_OR_NULL,
    DateCreated: DATE,
    DateUpdated: DATE,
  });

create("Students",
  ["UserId", "FirstName", "LastName", "GradeLevel", "Notes", "DateCreated", "DateUpdated"],
  {
    _id: OID,
    UserId: { bsonType: "objectId", description: "FK -> Users._id (who owns this student)" },
    FirstName: STR,
    LastName: STR,
    GradeLevel: STR,
    Notes: STR,
    DateCreated: DATE,
    DateUpdated: DATE,
  });

create("Behaviors",
  ["StudentId", "UserId", "Name", "Code", "Description", "Color", "IsArchived", "DateCreated", "DateUpdated"],
  {
    _id: OID,
    StudentId: { bsonType: "objectId", description: "FK -> Students._id" },
    UserId: { bsonType: "objectId", description: "FK -> Users._id" },
    Name: STR,
    Code: { bsonType: "string", pattern: "^[A-Z]$", description: "single capital letter shown on the chart" },
    Description: STR,
    Color: { bsonType: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    IsArchived: BOOL,
    DateCreated: DATE,
    DateUpdated: DATE,
  });

create("Sessions",
  ["UserId", "StudentId", "StartTime", "EndTime", "IntervalSeconds", "Status", "Notes", "DateCreated", "DateUpdated"],
  {
    _id: OID,
    UserId: { bsonType: "objectId", description: "FK -> Users._id" },
    StudentId: { bsonType: "objectId", description: "FK -> Students._id" },
    StartTime: DATE,
    EndTime: { bsonType: ["date", "null"], description: "null while the session is still running" },
    IntervalSeconds: INT,
    Status: { enum: ["active", "ended"] },
    Notes: STR,
    DateCreated: DATE,
    DateUpdated: DATE,
  });

create("BehaviorEvents",
  ["SessionId", "StudentId", "BehaviorId", "UserId", "Timestamp", "IntervalIndex"],
  {
    _id: OID,
    SessionId: { bsonType: "objectId", description: "FK -> Sessions._id" },
    StudentId: { bsonType: "objectId", description: "FK -> Students._id" },
    BehaviorId: { bsonType: "objectId", description: "FK -> Behaviors._id" },
    UserId: { bsonType: "objectId", description: "FK -> Users._id" },
    Timestamp: DATE,
    IntervalIndex: { bsonType: ["int", "long", "double"], minimum: 0, description: "floor((Timestamp - Session.StartTime) / IntervalSeconds)" },
  });

// ---------------------------------------------------------------------------
// 2) INDEXES (fast lookups + uniqueness rules)
// ---------------------------------------------------------------------------
db.Users.createIndex({ Login: 1 }, { unique: true, name: "uniq_login" });
db.Users.createIndex({ Email: 1 }, { unique: true, name: "uniq_email" });
db.Students.createIndex({ UserId: 1, LastName: 1, FirstName: 1 }, { name: "by_owner" });
// A letter can only be used once per student (archived behaviors free the letter up)
db.Behaviors.createIndex({ StudentId: 1, Code: 1 }, { unique: true, partialFilterExpression: { IsArchived: false }, name: "uniq_code_per_student" });
db.Sessions.createIndex({ StudentId: 1, StartTime: -1 }, { name: "student_history" });
db.Sessions.createIndex({ UserId: 1, Status: 1 }, { name: "by_owner_status" });
db.BehaviorEvents.createIndex({ SessionId: 1, Timestamp: 1 }, { name: "session_timeline" });
db.BehaviorEvents.createIndex({ StudentId: 1, BehaviorId: 1, Timestamp: -1 }, { name: "student_trends" });
print("Indexes created");

// ---------------------------------------------------------------------------
// 3) SAMPLE DATA (fixed ObjectIds so every foreign key points at a real document)
// ---------------------------------------------------------------------------

print("Inserting Users...");
db.Users.insertMany([
  { _id: ObjectId("6ad0dc600001000000000001"), FirstName: "Jordan", LastName: "Rivera", Email: "jordan.rivera@example.com", Login: "jrivera", Password: "$2b$10$mNXdaPZ4aThtSB8MhwQGAe8DvwwRe5MySFDsf77WVCu2oZn7pMBfW", Role: "teacher", IsVerified: true, VerificationToken: null, ResetPasswordToken: null, ResetPasswordExpires: null, DateCreated: ISODate("2026-10-15T14:00:00.000Z"), DateUpdated: ISODate("2026-10-15T14:00:00.000Z") },
  { _id: ObjectId("6ad0ea700001000000000002"), FirstName: "Avery", LastName: "Chen", Email: "avery.chen@example.com", Login: "achen", Password: "$2b$10$wyeiV44OTUtIND897EHmAOwF35gjDO5wFNJe0IFz7oicheT.Mse96", Role: "teacher", IsVerified: true, VerificationToken: null, ResetPasswordToken: null, ResetPasswordExpires: null, DateCreated: ISODate("2026-10-15T15:00:00.000Z"), DateUpdated: ISODate("2026-10-15T15:00:00.000Z") },
  { _id: ObjectId("6ad0f8800001000000000003"), FirstName: "Sam", LastName: "Patel", Email: "sam.patel@example.com", Login: "spatel", Password: "$2b$10$cwA5lYdBl4UCEZUxUb5MROPU39ZrY813TNujiKzsHMjiVF7taweja", Role: "parent", IsVerified: false, VerificationToken: "a3f9c2e1b7d84f60a1c5e9b2d7f3a8c4", ResetPasswordToken: null, ResetPasswordExpires: null, DateCreated: ISODate("2026-10-15T16:00:00.000Z"), DateUpdated: ISODate("2026-10-15T16:00:00.000Z") }
]);

print("Inserting Students...");
db.Students.insertMany([
  { _id: ObjectId("6ad21fd00002000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), FirstName: "Mia", LastName: "Thompson", GradeLevel: "2", Notes: "Prefers visual schedules. Break card on desk.", DateCreated: ISODate("2026-10-16T13:00:00.000Z"), DateUpdated: ISODate("2026-10-16T13:00:00.000Z") },
  { _id: ObjectId("6ad222280002000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), FirstName: "Leo", LastName: "Garcia", GradeLevel: "3", Notes: "Token board: 5 tokens = 2 min iPad.", DateCreated: ISODate("2026-10-16T13:10:00.000Z"), DateUpdated: ISODate("2026-10-16T13:10:00.000Z") },
  { _id: ObjectId("6ad224800002000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), FirstName: "Noah", LastName: "Williams", GradeLevel: "K", Notes: "", DateCreated: ISODate("2026-10-16T13:20:00.000Z"), DateUpdated: ISODate("2026-10-16T13:20:00.000Z") },
  { _id: ObjectId("6ad226d80002000000000004"), UserId: ObjectId("6ad0ea700001000000000002"), FirstName: "Zoe", LastName: "Martinez", GradeLevel: "1", Notes: "Working on requesting help with words.", DateCreated: ISODate("2026-10-16T13:30:00.000Z"), DateUpdated: ISODate("2026-10-16T13:30:00.000Z") },
  { _id: ObjectId("6ad229300002000000000005"), UserId: ObjectId("6ad0f8800001000000000003"), FirstName: "Eli", LastName: "Patel", GradeLevel: "4", Notes: "Home practice sessions after school.", DateCreated: ISODate("2026-10-16T13:40:00.000Z"), DateUpdated: ISODate("2026-10-16T13:40:00.000Z") }
]);

print("Inserting Behaviors...");
db.Behaviors.insertMany([
  { _id: ObjectId("6ad2200c0003000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Elopement", Code: "E", Description: "Leaves assigned area without permission", Color: "#E4572E", IsArchived: false, DateCreated: ISODate("2026-10-16T13:01:00.000Z"), DateUpdated: ISODate("2026-10-16T13:01:00.000Z") },
  { _id: ObjectId("6ad220480003000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Vocal outburst", Code: "V", Description: "Yelling or screaming above conversational volume", Color: "#F3A712", IsArchived: false, DateCreated: ISODate("2026-10-16T13:02:00.000Z"), DateUpdated: ISODate("2026-10-16T13:02:00.000Z") },
  { _id: ObjectId("6ad220840003000000000003"), StudentId: ObjectId("6ad21fd00002000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Task refusal", Code: "R", Description: "Says \"no\" or pushes materials away when given a task", Color: "#7B61FF", IsArchived: false, DateCreated: ISODate("2026-10-16T13:03:00.000Z"), DateUpdated: ISODate("2026-10-16T13:03:00.000Z") },
  { _id: ObjectId("6ad220c00003000000000004"), StudentId: ObjectId("6ad21fd00002000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Hand raise", Code: "H", Description: "Raises hand to get attention (replacement behavior)", Color: "#2E9E5B", IsArchived: false, DateCreated: ISODate("2026-10-16T13:04:00.000Z"), DateUpdated: ISODate("2026-10-16T13:04:00.000Z") },
  { _id: ObjectId("6ad222640003000000000005"), StudentId: ObjectId("6ad222280002000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Aggression", Code: "A", Description: "Hitting, kicking, or pushing peers or staff", Color: "#E4572E", IsArchived: false, DateCreated: ISODate("2026-10-16T13:11:00.000Z"), DateUpdated: ISODate("2026-10-16T13:11:00.000Z") },
  { _id: ObjectId("6ad222a00003000000000006"), StudentId: ObjectId("6ad222280002000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Off-task", Code: "O", Description: "Not engaged with assigned task for 10+ seconds", Color: "#F3A712", IsArchived: false, DateCreated: ISODate("2026-10-16T13:12:00.000Z"), DateUpdated: ISODate("2026-10-16T13:12:00.000Z") },
  { _id: ObjectId("6ad222dc0003000000000007"), StudentId: ObjectId("6ad222280002000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Asks for break", Code: "B", Description: "Uses break card or says \"break\" (replacement behavior)", Color: "#2E9E5B", IsArchived: false, DateCreated: ISODate("2026-10-16T13:13:00.000Z"), DateUpdated: ISODate("2026-10-16T13:13:00.000Z") },
  { _id: ObjectId("6ad224bc0003000000000008"), StudentId: ObjectId("6ad224800002000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Out of seat", Code: "S", Description: "Leaves seat during seated work", Color: "#F3A712", IsArchived: false, DateCreated: ISODate("2026-10-16T13:21:00.000Z"), DateUpdated: ISODate("2026-10-16T13:21:00.000Z") },
  { _id: ObjectId("6ad224f80003000000000009"), StudentId: ObjectId("6ad224800002000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Mand (request)", Code: "M", Description: "Requests an item or activity using words or AAC", Color: "#2E9E5B", IsArchived: false, DateCreated: ISODate("2026-10-16T13:22:00.000Z"), DateUpdated: ISODate("2026-10-16T13:22:00.000Z") },
  { _id: ObjectId("6ad22534000300000000000a"), StudentId: ObjectId("6ad224800002000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Name: "Crying", Code: "C", Description: "Crying lasting 5+ seconds", Color: "#3B82F6", IsArchived: false, DateCreated: ISODate("2026-10-16T13:23:00.000Z"), DateUpdated: ISODate("2026-10-16T13:23:00.000Z") },
  { _id: ObjectId("6ad22714000300000000000b"), StudentId: ObjectId("6ad226d80002000000000004"), UserId: ObjectId("6ad0ea700001000000000002"), Name: "Asks for help", Code: "H", Description: "Says \"help please\" or uses help card", Color: "#2E9E5B", IsArchived: false, DateCreated: ISODate("2026-10-16T13:31:00.000Z"), DateUpdated: ISODate("2026-10-16T13:31:00.000Z") },
  { _id: ObjectId("6ad22750000300000000000c"), StudentId: ObjectId("6ad226d80002000000000004"), UserId: ObjectId("6ad0ea700001000000000002"), Name: "Property destruction", Code: "D", Description: "Tearing, throwing, or breaking materials", Color: "#E4572E", IsArchived: false, DateCreated: ISODate("2026-10-16T13:32:00.000Z"), DateUpdated: ISODate("2026-10-16T13:32:00.000Z") },
  { _id: ObjectId("6ad2278c000300000000000d"), StudentId: ObjectId("6ad226d80002000000000004"), UserId: ObjectId("6ad0ea700001000000000002"), Name: "Off-task", Code: "O", Description: "Not engaged with assigned task for 10+ seconds", Color: "#F3A712", IsArchived: false, DateCreated: ISODate("2026-10-16T13:33:00.000Z"), DateUpdated: ISODate("2026-10-16T13:33:00.000Z") },
  { _id: ObjectId("6ad2296c000300000000000e"), StudentId: ObjectId("6ad229300002000000000005"), UserId: ObjectId("6ad0f8800001000000000003"), Name: "Task refusal", Code: "R", Description: "Refuses homework task after one prompt", Color: "#7B61FF", IsArchived: false, DateCreated: ISODate("2026-10-16T13:41:00.000Z"), DateUpdated: ISODate("2026-10-16T13:41:00.000Z") },
  { _id: ObjectId("6ad229a8000300000000000f"), StudentId: ObjectId("6ad229300002000000000005"), UserId: ObjectId("6ad0f8800001000000000003"), Name: "Independent work", Code: "I", Description: "Completes a step without prompting", Color: "#2E9E5B", IsArchived: false, DateCreated: ISODate("2026-10-16T13:42:00.000Z"), DateUpdated: ISODate("2026-10-16T13:42:00.000Z") },
  { _id: ObjectId("6ad229e40003000000000010"), StudentId: ObjectId("6ad229300002000000000005"), UserId: ObjectId("6ad0f8800001000000000003"), Name: "Vocal outburst", Code: "V", Description: "Yelling or screaming above conversational volume", Color: "#F3A712", IsArchived: false, DateCreated: ISODate("2026-10-16T13:43:00.000Z"), DateUpdated: ISODate("2026-10-16T13:43:00.000Z") }
]);

print("Inserting Sessions...");
db.Sessions.insertMany([
  { _id: ObjectId("6ad614500004000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), StartTime: ISODate("2026-10-19T13:00:00.000Z"), EndTime: ISODate("2026-10-19T13:30:00.000Z"), IntervalSeconds: 120, Status: "ended", Notes: "Morning reading block.", DateCreated: ISODate("2026-10-19T13:00:00.000Z"), DateUpdated: ISODate("2026-10-19T13:30:00.000Z") },
  { _id: ObjectId("6ad765d00004000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), StartTime: ISODate("2026-10-20T13:00:00.000Z"), EndTime: ISODate("2026-10-20T13:20:00.000Z"), IntervalSeconds: 120, Status: "ended", Notes: "Math centers. Fewer outbursts after break card reminder.", DateCreated: ISODate("2026-10-20T13:00:00.000Z"), DateUpdated: ISODate("2026-10-20T13:20:00.000Z") },
  { _id: ObjectId("6ad788f80004000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), StudentId: ObjectId("6ad222280002000000000002"), StartTime: ISODate("2026-10-20T15:30:00.000Z"), EndTime: ISODate("2026-10-20T15:54:00.000Z"), IntervalSeconds: 120, Status: "ended", Notes: "Writing activity.", DateCreated: ISODate("2026-10-20T15:30:00.000Z"), DateUpdated: ISODate("2026-10-20T15:54:00.000Z") },
  { _id: ObjectId("6ad8c5600004000000000004"), UserId: ObjectId("6ad0ea700001000000000002"), StudentId: ObjectId("6ad226d80002000000000004"), StartTime: ISODate("2026-10-21T14:00:00.000Z"), EndTime: ISODate("2026-10-21T14:16:00.000Z"), IntervalSeconds: 120, Status: "ended", Notes: "Small group art.", DateCreated: ISODate("2026-10-21T14:00:00.000Z"), DateUpdated: ISODate("2026-10-21T14:16:00.000Z") },
  { _id: ObjectId("6ad927d00004000000000005"), UserId: ObjectId("6ad0f8800001000000000003"), StudentId: ObjectId("6ad229300002000000000005"), StartTime: ISODate("2026-10-21T21:00:00.000Z"), EndTime: ISODate("2026-10-21T21:14:00.000Z"), IntervalSeconds: 120, Status: "ended", Notes: "Homework at home.", DateCreated: ISODate("2026-10-21T21:00:00.000Z"), DateUpdated: ISODate("2026-10-21T21:14:00.000Z") }
]);

print("Inserting BehaviorEvents...");
db.BehaviorEvents.insertMany([
  { _id: ObjectId("6ad614780005000000000001"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:00:40.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad614ac0005000000000002"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220840003000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:01:32.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad614e60005000000000003"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad2200c0003000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:02:30.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad614ed0005000000000004"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:02:37.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad615140005000000000005"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:03:16.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad6153f0005000000000006"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:03:59.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad6164d0005000000000007"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220840003000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:08:29.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad616690005000000000008"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:08:57.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad6169f0005000000000009"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:09:51.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad6171a000500000000000a"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:11:54.000Z"), IntervalIndex: 5 },
  { _id: ObjectId("6ad61730000500000000000b"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:12:16.000Z"), IntervalIndex: 6 },
  { _id: ObjectId("6ad6173e000500000000000c"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:12:30.000Z"), IntervalIndex: 6 },
  { _id: ObjectId("6ad617d3000500000000000d"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:14:59.000Z"), IntervalIndex: 7 },
  { _id: ObjectId("6ad617df000500000000000e"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:15:11.000Z"), IntervalIndex: 7 },
  { _id: ObjectId("6ad6181f000500000000000f"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:16:15.000Z"), IntervalIndex: 8 },
  { _id: ObjectId("6ad618aa0005000000000010"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220840003000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:18:34.000Z"), IntervalIndex: 9 },
  { _id: ObjectId("6ad618dd0005000000000011"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220840003000000000003"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:19:25.000Z"), IntervalIndex: 9 },
  { _id: ObjectId("6ad619720005000000000012"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad2200c0003000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:21:54.000Z"), IntervalIndex: 10 },
  { _id: ObjectId("6ad61a6d0005000000000013"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:26:05.000Z"), IntervalIndex: 13 },
  { _id: ObjectId("6ad61a910005000000000014"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:26:41.000Z"), IntervalIndex: 13 },
  { _id: ObjectId("6ad61ab10005000000000015"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:27:13.000Z"), IntervalIndex: 13 },
  { _id: ObjectId("6ad61afe0005000000000016"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:28:30.000Z"), IntervalIndex: 14 },
  { _id: ObjectId("6ad61b4f0005000000000017"), SessionId: ObjectId("6ad614500004000000000001"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-19T13:29:51.000Z"), IntervalIndex: 14 },
  { _id: ObjectId("6ad7661f0005000000000018"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:01:19.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad766560005000000000019"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:02:14.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad76666000500000000001a"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:02:30.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad766b1000500000000001b"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad2200c0003000000000001"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:03:45.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad76701000500000000001c"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:05:05.000Z"), IntervalIndex: 2 },
  { _id: ObjectId("6ad7675b000500000000001d"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:06:35.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad76768000500000000001e"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:06:48.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad767db000500000000001f"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:08:43.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad767ff0005000000000020"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:09:19.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad768340005000000000021"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:10:12.000Z"), IntervalIndex: 5 },
  { _id: ObjectId("6ad769070005000000000022"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:13:43.000Z"), IntervalIndex: 6 },
  { _id: ObjectId("6ad769780005000000000023"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220480003000000000002"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:15:36.000Z"), IntervalIndex: 7 },
  { _id: ObjectId("6ad76a230005000000000024"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:18:27.000Z"), IntervalIndex: 9 },
  { _id: ObjectId("6ad76a360005000000000025"), SessionId: ObjectId("6ad765d00004000000000002"), StudentId: ObjectId("6ad21fd00002000000000001"), BehaviorId: ObjectId("6ad220c00003000000000004"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T13:18:46.000Z"), IntervalIndex: 9 },
  { _id: ObjectId("6ad789120005000000000026"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222a00003000000000006"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:30:26.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad7893f0005000000000027"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222640003000000000005"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:31:11.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad7895c0005000000000028"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222640003000000000005"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:31:40.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad789fa0005000000000029"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222a00003000000000006"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:34:18.000Z"), IntervalIndex: 2 },
  { _id: ObjectId("6ad78a4e000500000000002a"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222dc0003000000000007"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:35:42.000Z"), IntervalIndex: 2 },
  { _id: ObjectId("6ad78a70000500000000002b"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222dc0003000000000007"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:36:16.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad78a71000500000000002c"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222a00003000000000006"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:36:17.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad78aba000500000000002d"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222dc0003000000000007"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:37:30.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad78b21000500000000002e"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222a00003000000000006"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:39:13.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad78b33000500000000002f"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222dc0003000000000007"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:39:31.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad78bbc0005000000000030"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222640003000000000005"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:41:48.000Z"), IntervalIndex: 5 },
  { _id: ObjectId("6ad78bcd0005000000000031"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222640003000000000005"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:42:05.000Z"), IntervalIndex: 6 },
  { _id: ObjectId("6ad78d1f0005000000000032"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222a00003000000000006"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:47:43.000Z"), IntervalIndex: 8 },
  { _id: ObjectId("6ad78df90005000000000033"), SessionId: ObjectId("6ad788f80004000000000003"), StudentId: ObjectId("6ad222280002000000000002"), BehaviorId: ObjectId("6ad222dc0003000000000007"), UserId: ObjectId("6ad0dc600001000000000001"), Timestamp: ISODate("2026-10-20T15:51:21.000Z"), IntervalIndex: 10 },
  { _id: ObjectId("6ad8c5a20005000000000034"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22714000300000000000b"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:01:06.000Z"), IntervalIndex: 0 },
  { _id: ObjectId("6ad8c6db0005000000000035"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22750000300000000000c"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:06:19.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad8c73e0005000000000036"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22750000300000000000c"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:07:58.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad8c7700005000000000037"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad2278c000300000000000d"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:08:48.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad8c7c80005000000000038"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22714000300000000000b"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:10:16.000Z"), IntervalIndex: 5 },
  { _id: ObjectId("6ad8c8a10005000000000039"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22714000300000000000b"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:13:53.000Z"), IntervalIndex: 6 },
  { _id: ObjectId("6ad8c8bd000500000000003a"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22714000300000000000b"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:14:21.000Z"), IntervalIndex: 7 },
  { _id: ObjectId("6ad8c912000500000000003b"), SessionId: ObjectId("6ad8c5600004000000000004"), StudentId: ObjectId("6ad226d80002000000000004"), BehaviorId: ObjectId("6ad22714000300000000000b"), UserId: ObjectId("6ad0ea700001000000000002"), Timestamp: ISODate("2026-10-21T14:15:46.000Z"), IntervalIndex: 7 },
  { _id: ObjectId("6ad92863000500000000003c"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229a8000300000000000f"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:02:27.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad9287a000500000000003d"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad2296c000300000000000e"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:02:50.000Z"), IntervalIndex: 1 },
  { _id: ObjectId("6ad92971000500000000003e"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229a8000300000000000f"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:06:57.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad92996000500000000003f"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229e40003000000000010"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:07:34.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad9299b0005000000000040"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229a8000300000000000f"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:07:39.000Z"), IntervalIndex: 3 },
  { _id: ObjectId("6ad929c00005000000000041"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad2296c000300000000000e"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:08:16.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad929ce0005000000000042"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229a8000300000000000f"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:08:30.000Z"), IntervalIndex: 4 },
  { _id: ObjectId("6ad92a2f0005000000000043"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229e40003000000000010"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:10:07.000Z"), IntervalIndex: 5 },
  { _id: ObjectId("6ad92b070005000000000044"), SessionId: ObjectId("6ad927d00004000000000005"), StudentId: ObjectId("6ad229300002000000000005"), BehaviorId: ObjectId("6ad229a8000300000000000f"), UserId: ObjectId("6ad0f8800001000000000003"), Timestamp: ISODate("2026-10-21T21:13:43.000Z"), IntervalIndex: 6 }
]);

// ---------------------------------------------------------------------------
// 4) QUICK CHECK — counts + one example of the end-of-session chart
// ---------------------------------------------------------------------------
print("\n=== Document counts ===");
["Users", "Students", "Behaviors", "Sessions", "BehaviorEvents"].forEach((c) =>
  print(c.padEnd(15) + db.getCollection(c).countDocuments()));

const firstSession = db.Sessions.find().sort({ StartTime: 1 }).limit(1).toArray()[0];
const chart = db.BehaviorEvents.aggregate([
  { $match: { SessionId: firstSession._id } },
  { $lookup: { from: "Behaviors", localField: "BehaviorId", foreignField: "_id", as: "b" } },
  { $unwind: "$b" },
  { $group: { _id: { i: "$IntervalIndex", code: "$b.Code" }, count: { $sum: 1 } } },
  { $sort: { "_id.code": 1 } },
  { $group: { _id: "$_id.i", codes: { $push: "$_id.code" } } },
  { $sort: { _id: 1 } },
]).toArray();

const totalIntervals = Math.ceil((firstSession.EndTime - firstSession.StartTime) / (firstSession.IntervalSeconds * 1000));
const byIndex = {};
chart.forEach((r) => { byIndex[r._id] = r.codes.join(" "); });
print("\n=== Chart for first session (" + totalIntervals + " x 2-min intervals) ===");
for (let i = 0; i < totalIntervals; i++) {
  const from = i * 2, to = from + 2;
  print(String(from).padStart(2, "0") + "-" + String(to).padStart(2, "0") + " min | " + (byIndex[i] || "-"));
}
print("\nDone. Refresh Compass to see the " + db.getName() + " database.");
