const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  FirstName: {
    type: String,
    required: true,
  },
  LastName: {
    type: String,
    required: true,
  },
  Age: {
    type: Number,
    required: true,
  },
  DateOfJoining: {
    type: Date,
    required: true,
  },
  Title: {
    type: String,
    required: true,
  },
  Department: {
    type: String,
    required: true,
  },
  EmployeeType: {
    type: String,
    enum: ["Full-Time", "Part-Time", "Contractor"], // Defined options
    required: true,
  },
});

const Employee = mongoose.model("employee_main", employeeSchema);
module.exports = Employee;
