"use strict";

const settings = {
    JSON_URL: "https://raw.githubusercontent.com/wrike/frontend-test/master/data.json",
    appMountPoint: "app",
    sortDirection: 0,
    filterStr: "",
};

const tree = {
    root: {},
    nodesMap: new Map(),
    filteredNodesSet: new Set(),
    init() {
        this.root = {};
        this.nodesMap = new Map();
        this.filteredNodesSet = new Set();
    },

};

const appFolderView = {
    settings,
    data: {},
    tree,

    init(userSettings) {

        Object.assign(settings, userSettings);

        if (this.getMountPoint()) {
            fetch(this.settings.JSON_URL)
                .then(result => result.json())
                .then(data => {
                    this.data = data;
                    this.render();
                    this.setEventHandlers();
                })
                .catch(error => {
                    console.log(error);
                });
        } else {
            console.error("Please check whether there is correct Mount Point for the application");
        }
    },

    render() {

        this.getMountPoint().innerHTML =
            '<button id="fv-sortInit"">Initial order</button> \
            <button id="fv-sortAZ" class="fv-btn">Sort A-Z</button> \
            <button id="fv-sortZA" class="fv-btn">Sort Z-A</button> \
            <input id="fv-filter"><ul id="fv-treeRoot"></ul>';

        this.renderTree();

    },

    renderTree() {

        this.buildTree();
        document.getElementById("fv-treeRoot").innerHTML = this.renderNode(this.tree.root);
    },

    renderNode(node) {

        if (!this.tree.filteredNodesSet.has(node.id)) return "";

        let html = "<li class='fv-listItem'>" + node.title;
        if (node.children.length > 0) {
            html += "<ul class='fv-list'>";
            html += node.children.reduce((acc, item) => acc += this.renderNode(item), "");
            html += "</ul>";
        }

        html += "</li>";
        return html;

    },

    setEventHandlers() {

        document.getElementById("fv-sortInit").addEventListener('click', () => this.sort(0));
        document.getElementById("fv-sortAZ").addEventListener('click', () => this.sort(1));
        document.getElementById("fv-sortZA").addEventListener('click', () => this.sort(-1));
        document.getElementById("fv-filter").addEventListener('keyup', event => this.filter(event.target.value));
        this.getMountPoint().addEventListener('click', event => this.clickHandler(event));

    },

    sort(sortDirection) {
        this.settings.sortDirection = sortDirection;
        this.renderTree();
    },

    filter(str) {
        this.settings.filterStr = str;
        this.renderTree();
    },

    getMountPoint() {
        return document.getElementById(this.settings.appMountPoint);
    },

    buildTree() {

        let childrenMap = new Map();
        this.tree.init();

        this.data
            .slice()
            .sort((a, b) => {
                if (a.title > b.title)
                    return this.settings.sortDirection;
                if (a.title < b.title)
                    return -1 * this.settings.sortDirection;
                return 0;
            })
            .forEach((item) => {
                this.tree.nodesMap.set(item.id, item);
                if (item.id === -1) {
                    this.tree.root = item;
                } else {
                    if (!childrenMap.has(item.parentId)) childrenMap.set(item.parentId, []);
                    childrenMap.get(item.parentId).push(item);
                }

                if (!childrenMap.has(item.id)) childrenMap.set(item.id, []);
                item.children = childrenMap.get(item.id);

            });

        this.filterTree();

    },

    filterTree() {
        this.tree.nodesMap.forEach((node, id) => {
            if (!this.tree.filteredNodesSet.has(id) && this.filterNode(node)) {
                this.tree.filteredNodesSet.add(id);
                let parent = this.tree.nodesMap.get(node.parentId);
                while (parent && !this.tree.filteredNodesSet.has(parent.id)) {
                    this.tree.filteredNodesSet.add(parent.id);
                    parent = this.tree.nodesMap.get(parent.parentId);
                }
            }
        });
    },

    filterNode(node) {
        return node.title.toLowerCase().includes(this.settings.filterStr.toLowerCase());
    },


    clickHandler(event) {
        let target = event.target;
        if (target.classList.contains('fv-listItem') && target.firstElementChild && target.firstElementChild.nodeName === "UL") {
            target.firstElementChild.classList.toggle('hidden');
        }
    },


};

window.onload = appFolderView.init();