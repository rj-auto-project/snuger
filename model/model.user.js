var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * User Schema
 */
var userSchema = new Schema({
  username: {
    type: String,
    required:true
  },
  user_id: {
    type: String,
    unique:true,
    required:true
  },
  user_img: {
    type: String,
    required:true
  },
  phone_number:{
    type: String,
    required:true
  },
  snug_score:{
    type:Number,
    default:0
  },
  geo_coordinates: {
    type: [Number], // Array containing [latitude, longitude]
    required: true,
  },  
  created_at: {
    type: Date,
    default: Date.now
  }
},
{collection:"user"}
);

module.exports = mongoose.model('User', userSchema);