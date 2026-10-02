const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render("projectList", {layout: "./layouts/main"});
});

router.get('/neu', (req, res) => {
    res.render("projectNew", {layout: "./layouts/main"});
});

router.post("/", (req, res) => {
    console.log(request.body.projectName);
    res.redirect("/project");
});

router.route('/:id').get((req, res) => {
    let ID = req.params.id;
    res.render("project", {layout: "./layouts/main", projectID: ID});
})
.put((req, res) => {
    response.send("Project updated");
})
.delete((req, res) => {
    response.send("Project deleted");
});

module.exports = router;