// assign order in dictionaries
var projectsNewest = { "The Floor Is Lava": 1, "Prismatic" : 2, "Wispers" : 3, "Dark Patterns" : 4};
var projectsBest = { "TheFloorIsLava": 3, "Prismatic" : 2, "Wispers" : 1, "DarkPatterns" : 4};

// project div information
var ids = ["The Floor Is Lava", "Prismatic", "Wispers", "Dark Patterns"];
var page = { "The Floor Is Lava": "pages/TheFloorIsLava.html", "Prismatic" : "pages/Pismatic.html", "Wispers" : "pages/Wispers.html", 
"Dark Patterns" : "pages/DarkPatterns.html"};
var image = { "The Floor Is Lava": "media/TheFloorIsLava-InGame.png", "Prismatic" : "media/Prismatic.PNG", "Wispers" : "media/Wisper-InGame.png", 
"Dark Patterns" : "media/DarkPatterns-Title.png"};
var allClass = "col s6 grey lighten-3 center-align"; // all child divs use the same class for materialize

// create the child div element using the information dictionaries in order using their id's
function createDiv() {

}

// append the created children to the Projects div
function AddDiv() {

}

/*
// get id's
let allProjects = document.querySelector("#Projects").querySelectorAll(".div");
let allNames = [];
for (let i = 0; i < allProjects.length; i++) {
    allNames.push(allProjects[i].getAttribute("id"));
}
*/