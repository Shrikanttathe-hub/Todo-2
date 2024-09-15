const express = require("express");
 require("dotenv").config();
 const mongoose = require("mongoose");
 const bcrypt = require("bcryptjs");
 const session = require('express-session')
 const mongodbSession = require('connect-mongodb-session')(session)

 
 //file-importS
 const userModel = require("./models/userModels");
 const { userDataValidation, isEmailvalidate } = require("./utils/authUtils");
const isAuth = require("./middlewares/isAuthMiddleware");
const { todoDataValidation } = require("./utils/todoUtils");
const todoModel = require("./models/todoModel");
const rateLimiting = require("./middlewares/rateLimitingMiddleware");

// constants 
const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const store = new mongodbSession({
    uri : MONGO_URI,
    collection: "sessions"
});

// middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true})); // to show console registration details
app.use(express.json()); // for postman
app.use(express.static("public"));
app.use(session({
    secret : process.env.SECRET_KEY,
    store : store,
    resave: false,
    saveUninitialized: false,
})
);

// app.set("name", "Shrikant"); [example purpose]
// console.log(app.get("name"));

//db connection 
mongoose
.connect(MONGO_URI)
.then(() => console.log("MongoDb Connected successfully..."))
.catch((err)=> console.log(err));

app.get("/", (req, res) => {
 return res.render("homePage");
});

// registration
app.get("/register", (req, res) => {
    return res.render("registerPage");
});

app.post("/register", async (req, res) => {
    console.log(req.body);
    const {name, email, username, password} = req.body;
    // email and username should be unique .findOne({ key: val})

    // data validation
    try {
      await userDataValidation({name, email, username, password});  
    } catch (error) {
       return res.status(400).json(error); 
    }


    try {

    // check email exist or not
   const userEmailExist = await userModel.findOne({email});

   if(userEmailExist)
   {
    return res.status(400).json("Email already exist");
   }

   const userUsernameExist = await userModel.findOne({ username});
   
   if(userUsernameExist)
    {
         return res.status(400).json("Username already exist..");
     }

//hash  the password
const hashedPassword = await bcrypt.hash(password, Number(process.env.SALT));

    const userObj = new userModel({
    // schema : client
    name: name,
    email: email,
    username: username,
    password: hashedPassword,
});

  // const userDb = await userObj.save() // to save into the database
   
   return res.redirect("/login");

} catch (error) {
    console.log(error);
    return res
    .status(500)
    .json({ message: "Internal server error", error: error});    
}   
 });
    
// Login
app.get("/login", (req, res) => {
    return res.render("loginPage");
});

app.post("/login", async (req, res) => {
    console.log(req.body);

    const {loginId, password} = req.body;

// data validation
    if(!loginId || !password) return res.status(400).json("Missing LoginId/Password");

    if(typeof loginId !== "string") 
       return res.status(400).json("Login id is not a text");

    if(typeof password !== "string") 
       return res.status(400).json("Password is not a text.");

 
try {
    let userDb = {};
    //Find the user base on loginId
if(isEmailvalidate({key: loginId})){
    userDb = await userModel.findOne({ email: loginId});
}else{
    userDb = await userModel.findOne({ username: loginId});
}

if(!userDb){
    return res.status(400).json("User not found, please register first");
}

// & compare the password
const isMatch = await bcrypt.compare(password, userDb.password);

if(!isMatch){
    return res.status(400).json("Incorrect password");
}

//storing session in DB
req.session.isAuth = true
req.session.user = {
    userId: userDb._id,
    username: userDb.username,
    email:userDb.email,
};

return res.redirect("/dashboard");
} catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error  });
}
});

app.get("/dashboard", isAuth ,(req, res) => {
    // return res.render("dashboardPage", {todoDb}); // bugs should be resolve
    return res.render("dashboardPage");
   });
   
// app.post("/logout", (req, res) => {
//     return res.send("Logout successfull.");
// })

app.post("/logout", isAuth, (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            return res.status(500).json(err);
        } else{
            return res.redirect("/login");
        }
    });
});

app.post('/logout-out-from-all', isAuth, async (req, res) => {
    console.log(req.session);
    const username = req.session.user.username
   //schema
    const sessionSchema = new mongoose.Schema({ _id : String }, {strict : false});
   // model
    const sessionModel = mongoose.model("session", sessionSchema);

    try {
        const deleteDb = await sessionModel.deleteMany({"session.user.username": username,});
        console.log(deleteDb);
        return res.status(200).json("Logout from all devices"); 
    } catch (error) {
        return res.status(500).json(error);
    }
    
    //model.deleteMany({ username : req.session.user.username}) 
    //if you want to delete multiple entries
    return res.send("all  ok");
});

//TODO's API
app.post("/create-item", isAuth, rateLimiting, async (req, res) => {
    console.log(req.body);
    const todo = req.body.todo;
    const username = req.session.user.username;

    //data 
    try {
       await todoDataValidation({ todo }); 
    } catch (error) {
        return res.send({
            status:400,
            message: error,
        });
    }
   
    const todoObj = new todoModel({
       todo: todo,
       username: username,
    });
    
    try {
     const todoDb = await todoObj.save();
     console.log(todoDb);

     //return res.status(201).json("") // it will change the browser status
     return res.send({
        status: 201,
        message: "Todo created successfully.",
        data: todoDb,
     });
    } catch (error) {
        return res.send({
          status: 500,
          message: "Internal server error",
          error: error,
        });
    }
});

// read-item?skip=10
app.get('/read-item', isAuth, async (req, res) => {
    const username = req.session.user.username;
    const SKIP = parseInt(req.query.skip) || 0;

    try {
        // const todoDb = await todoModel.find({ username});
         const todoDb = await todoModel.aggregate([[
            //pagination, match
            {
                $match: { username: username },
            },
            {
                $skip: SKIP,
            },
            {
                $limit: 5,
            },
         ]]);

        console.log(todoDb);
        
        if (todoDb.length === 0) {
            return res.send({
                status: 203,
                message: "No todo found.",
            });
        }

        return res.send({
            status: 200,
            message: "Read success",
            data: todoDb,
        });
    } catch (error) {
        return res.send({
            status: 500,
            message: "Internal server error",
            error: error,
        });
    }
    //todoModel.find({username : req.session.user.username})
});

app.post('/edit-item', isAuth, async (req, res) => {
  const newData = req.body.newData; 
  const todoId = req.body.todoId; 
  const usernameReq = req.session.user.username; 

  try {
   await todoDataValidation({ todo: newData });
  } catch (error) {
    return res.send({
        status: 400,
        message : error,
    });
  }

//find the todo
  try {
    const todoDb = await todoModel.findOne({_id : todoId });

    if(!todoDb) {
        return res.send({ status: 400, message: "ToDo not found."});
    }
    console.log(todoDb.username, usernameReq);
     // check the ownership
    if (todoDb.username !== usernameReq){
        return res.send({
            status: 403,
            message: "Not allow to edit the todo",
        });
    }
  
   //edit the to do
   const todoDbPrev = await todoModel.findOneAndUpdate(
    { _id : todoId}, 
    {todo : newData}
);

   return res.send({
    status : 200,
    message : "Todo updated successfully.",
    data : todoDbPrev,
   });
  } catch (error) {
    return res.send({
        status : 500,
        message : "Internal server error",
        error: error,
    });
  }

   //todoModel.Query({todo : newData})
  //todoModel.findOneAndUpdate({_id : todoId}, {todo : newData})
 //todoModel.updateOne({_id : todoId}, {todo : newData})
});

app.post('/delete-item', isAuth, async (req, res) => {
    const todoId = req.body.todoId;
    const usernameReq = req.session.user.username;
    
  //find the todo
    try {
      const todoDb = await todoModel.findOne({_id : todoId });
  
      if(!todoDb) {
          return res.send({ status: 400, message: "ToDo not found."});
      }
      console.log(todoDb.username, usernameReq);
       // check the ownership
      if (todoDb.username !== usernameReq){
          return res.send({
              status: 403,
              message: "Not allow to delete the todo",
          });
      }
    
     //edit the to do
     const todoDbPrev = await todoModel.findOneAndDelete(
      { _id : todoId}, 
  );
  
     return res.send({
      status : 200,
      message : "Todo deleted successfully.",
      data : todoDbPrev,
     });
    } catch (error) {
      return res.send({
          status : 500,
          message : "Internal server error",
          error: error,
      });
    }
  
     //todoModel.Query({todo : newData})
    //todoModel.findOneAndUpdate({_id : todoId}, {todo : newData})
   //todoModel.updateOne({_id : todoId}, {todo : newData})
  });

app.listen(PORT, () => {
    console.log(`Server is Running at: http://localhost:${8000}`);
})


// session
//global middlewares, initialise the session (req.sesstion)