const isEmailvalidate = ({key}) => {
    const isEmail = 
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
         key   
      );
      return isEmail;
  };

const userDataValidation = ({name, email, username, password}) => {
    // we generaly use {} for order does not matter to calling any parameter
    return new Promise((resolve, reject)=> {

        if( !email || !username || !password) reject("Missing user Data");
 
        if(typeof email !== "string") reject("email is not a text");
        if(typeof username !== "string") reject("username is not a text");
        if(typeof password !== "string") reject("password is not a text");

        console.log(isEmailvalidate({key : email}));

        if(username.length < 3 || username.length > 50) reject("username length should be 3-50 characters.");

        if(!isEmailvalidate({key:email})) reject("Format of an email incorrect");

        resolve();
    });
};

module.exports = { userDataValidation, isEmailvalidate }; 