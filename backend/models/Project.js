const mongoose=require('mongoose')

const projectschema= new mongoose.Schema({
    name:{
        type:String,
        required : true
    },

    description: {
      type: String,
      default: ""
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

projectschema.index({ workspace: 1 });
projectschema.index({ createdBy: 1 });

module.exports = mongoose.models.Project || mongoose.model("Project", projectschema);
