let skip = 0;
window.onload = generateTodos;

function generateTodos(){
    //read-item
    axios.get(`/read-item?skip=${skip}`)
     .then((res)=> {
        console.log(res);
        if (res.data.status !== 200) {
            alert(res.data.message);
            return ;
        }
        const todos = res.data.data;
        skip += todos.length;
        console.log(todos);

        document.getElementById("item_list").insertAdjacentHTML("beforeend", todos.map((item) => {
            return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
           <span class="item-text">${item.todo}</span>
           <div>
           <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
           <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
           </div></li>`;
        }).join("")
        );
        })
    .catch((err)=> {
        console.log(err);
    });
}

document.addEventListener("click", function (event) {
    //edit
    if (event.target.classList.contains("edit-me")) {
        // console.log("edit button click");
        // console.log(event.target);
        // console.log(event.target.getAttribute("data-id"));
        const todoId = event.target.getAttribute("data-id");
        const newData = prompt("Enter new Todo Text");
        // console.log(prompt("Enter new todo Text"));
     axios.post("/edit-item", { newData, todoId })
     .then((res)=> {console.log(res);
        if (res.data.status !== 200){
            alert(res.data.message);//showing validation
            return;
        }
        event.target.parentElement.parentElement.querySelector(
            ".item-text")
            .innerHTML = newData; // direct change the todo on ui
     })
     .catch((err) => console.log(err));
    } 
    //delete
    else if (event.target.classList.contains("delete-me")) {
        // console.log("delete button click");
        const todoId = event.target.getAttribute("data-id");
        axios.post("/delete-item" , { todoId })
        .then((res)=>{
             if(res.data.status !== 200){
            alert(res.data.message);
            return ;
        }
        event.target.parentElement.parentElement.remove();
    })
    .catch((err)=> console.log(err));
    }
     // create
    else if (event.target.classList.contains("add_item")){
       console.log("Add button clicked.");
       const todo = document.getElementById("create_field").value;
       
       axios.post("/create-item", { todo })
       .then((res)=> { 
        console.log(res);
        if (res.data.status !== 201){
            alert(res.data.message);
            return ;
        }
        document.getElementById("create_field").value = "";
        if (skip < 5){
        document.getElementById("item_list")
        .insertAdjacentHTML(
            "beforeend",
           `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
           <span class="item-text">${res.data.data.todo}</span>
           <div>
           <button data-id="${res.data.data._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
           <button data-id="${res.data.data._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
           </div></li>`
        )
        .join("");
      }
     })
       .catch((err)=> {
        console.log(err);

       });
     }
    else if (event.target.classList.contains("show_more")){
      generateTodos();
    }
});
   

// client(axios) <-----> server(api) <-----> db