const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' , { useNewUrlParser: true })

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  _id:{type: String, required: true},
  username:{type: String, required: true},
  log:[{
    description: {type: String, required:true},
    duration: {type:Number,required:true},
    date: { type: Date, default: Date.now }
  }],
  
},{
    versionKey: false // You should be aware of the outcome after set to false
});

var User = mongoose.model('User',UserSchema);

//CRETAE USER
var createAndSaveUser = function(userName,done){
    User.findOne({username:userName},function(err,data){
      
      if(err){
          console.log('Error: ',err);
      }
      else{ 
        console.log(data);
        if(!data){
            var userId = shortid.generate();
           // short = new Url({fullUrl:fullUrl,shortUrl:`${baseUrl}/${shortIdUrl}`});
            var newUser = new User({_id:userId,username:userName});
            console.log("epa");
            newUser.save(function(err,data){
              if(err){
                  console.log('Error: ',err);
              }
              else{
                done(data);
              }
            });
        }
        else{
          done(data,'Username already taken');
        }
      }
             
    
    });
}


//DELETE ALL USERS
var deleteAll= function(done){
  User.deleteMany({},function(err,data){        
        var short;
        if(err){
            console.log('Error: ',err);
        }
        else{ 
          done(data);
        }
      });
}


//FIND ALL USERS
var findAllUsers = function(done){
  User.find({},"-log",function(err,data){
    if(err){
          console.log('Error: ',err);
      }
      else{ 
        console.log(data);
        if(!data){
          done(data,'There are no users yet');
        }
        else{
          done(data);
        }
      }
  });
}

//ADD EXCERCISE
var addExcercise = function(userId,description,duration,date,done){
    User.findById({_id:userId},function(err,data){
      
      if(err){
          console.log('Error: ',err);
      }
      else{ 
        console.log(data);
        if(!data){
            
           done(data,`There's no user with that ID`);
        }
        else{
          date?data.log.push({description:description, duration:duration,date:date}):data.log.push({description:description, duration:duration});
          data.save(function(err,data){err? done(null,err):done(data);});
          
        }
      }
             
    
    });
};

//FIND LOGS BY USER ID
var findLogsByUserId = function(userId,startDate,endDate,limit,done){
  var query;
  if(startDate && endDate){
    query = User.findOne({_id:userId,'log.date':{$gt:startDate,$lt:endDate}});
  }
  else{
    query = User.findOne({_id:userId});
  }
  
 
  query = query.select('-log._id');
  
  query.exec(function(err,data){
      if(err){
          console.log('Error: ',err);
      }
      else{ 
       
        if(!data){
          done(data,'There is no user with this user ID');
        }
        else{
          done(data);
        }
      }
    
    
    
  });
};

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.get("/api/remove", function (req, res,next) {
  
  deleteAll(function(data){
    
    if (data) {
      res.send("Deleted");
    }
    else{
      res.send("There was a problem");
    }
    
  });
});


app.post("/api/exercise/new-user", function (req,res,next){
  
  createAndSaveUser(req.body.username,function(data,message){
       
        if (!data) {
          console.log('Missing `done()` argument');
          return next({message: 'Missing callback argument'});
        }
        else{
          if(message){
            res.send(message);
          }
          else{
            res.json({"username":data.username,"_id":data._id});
          }
        }
      });
});

app.get("/api/exercise/users",function(req,res,next){
  findAllUsers(function(data,message){
        if (!data) {
          console.log('Missing `done()` argument');
          return next({message: 'Missing callback argument'});
        }
        else{
          if(message){
            res.send(message);
          }
          else{
            res.json(data);
          }
        }
      });
});

app.post("/api/exercise/add",function(req,res,next){
  
  if(!req.body.userId){
     res.send('Field userId id required');
  }
  if(!req.body.description){
    res.send('Field description id required');
  }
  if(!req.body.duration){
    res.send('Field duration id required');
  }
  addExcercise(req.body.userId,req.body.description,req.body.duration,req.body.date,function(data,message){
        if (!data) {
          console.log('Missing `done()` argument');
          return next({message: message});
        }
        else{
          if(message){
            res.send(message);
          }
          else{
            var lastIndex = data.log.length-1
            res.json({userId:data._id, username:data.username, description:data.log[lastIndex].description, duration:data.log[lastIndex].duration, date: `${data.log[lastIndex].date.getFullYear()}-${data.log[lastIndex].date.getMonth()+1}-${data.log[lastIndex].date.getDate()}`});
          }
        }
      });
});

// /api/exercise/log?userId=gkohhIssR&from=2018-07-12&to=2020-01-12&limit=1

app.get("/api/exercise/log",function(req,res,next){
  var limit;
   if(!req.query.userId){
     res.send('Unknown user');
  }
  if(req.query.limit){
      limit=parseInt(req.query.limit);
  }
  
  findLogsByUserId(req.query.userId,req.query.from,req.query.to,limit,function(data,message){
        
    
    if (!data) {
          console.log('Missing `done()` argument');
          return next({message: message});
        }
        else{
          if(message){
            res.send(message);
          }
          else{
            var log;
            
            if(req.query.from ||  req.query.to){
             
                log = data.log.filter(function(exercise){
                  var date = `${exercise.date.getFullYear()}-${exercise.date.getMonth()+1}-${exercise.date.getDate()}`;
                  
                  
                  if( ((date>=req.query.from) || (date<=req.query.to)) ){
                   
                    return exercise;
                  }
                  
                });
            }
            else{
              log = data.log;
            }
           
            if(limit && limit>0){
               log = log.slice(0,limit);
            }
            
            res.json({userId:data._id, username:data.username,count:log.length,log:log});
          }
        }
      });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})







const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
