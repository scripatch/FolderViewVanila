"use strict";

/**
 * Объект DTO с настройками дерева папок
 * @property {string} JSON_URL Строка с ссылкой к файлу JSON
 * @property {string} appMountPoint Id элемента в DOM, в котором построится дерево папок
 * @property {int} sortDirection Направление сортировки дерева папок: 1 - по возрастанию, -1 - по убыванию, 0 - без сортировки
 * @property {string} filterStr Строка фильтрации названий папок
 */
const settings = {
    JSON_URL: "https://raw.githubusercontent.com/wrike/frontend-test/master/data.json",
    appMountPoint: "app",
    sortDirection: 0,
    filterStr: "",
};

/**
 * Объект сгенерированного дерева папок
 * @property {Object} root Корневой элемент дерева папок
 * @property {Map} nodesMap Соответствие id элементов с самими элементами, для быстрого доступа к элементу по id
 * @property {Set} filteredNodesSet Набор id элементов, удоблетворяющих условиям фильтра
 */
const tree = {
    root: {},
    nodesMap: new Map(),
    filteredNodesSet: new Set(),

    /**
     * Инициализация дерева, обнуление корня и коллекций
     */
    init() {
        this.root = {};
        this.nodesMap = new Map();
        this.filteredNodesSet = new Set();
    },

};

/**
 * Основной объект приложения - "Визуализация папок"
 * @property {Object} settings Настройки дерева папок
 * @property {Array} data Массив исходных объектов - элементов дерева, полученный из JSON
 * @property {Object} tree Сгенерированное дерево папок
 */
const appFolderView = {
    settings,
    data: [],
    tree,

    /**
     * Инициализация приложения, загрузка пользовательских настроек, получение данных, отрисовка основных элементов
     * @param userSettings
     */
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

    /**
     * Отрисовка основных элементов управления и первая отрисовка самого дерево папок
     */
    render() {

        this.getMountPoint().innerHTML =
            '<button id="fv-sortInit" class="fv-btn">Initial order</button> \
            <button id="fv-sortAZ" class="fv-btn">Sort A-Z</button> \
            <button id="fv-sortZA" class="fv-btn">Sort Z-A</button> \
            <input id="fv-filter" class="fv-filter"><ul id="fv-treeRoot" class="fv-list fv-rootList"></ul>';

        this.renderTree();

    },

    /**
     * Отрисовка дерева папок
     */
    renderTree() {

        this.buildTree();
        document.getElementById("fv-treeRoot").innerHTML = this.renderNode(this.tree.root);
    },

    /**
     * Формирование HTML строки для одного элемента дерева
     * @param {Object} node Элемент дерева папок по которому формируется HTML строка
     * @returns {string} Сформированная HTML строка
     */
    renderNode(node) {

        if (!this.tree.filteredNodesSet.has(node.id)) return "";

        let html = "<li class='fv-listItem'>" + node.title;
        if (node.children.length > 0) {
            html += "<ul class='fv-list'>";
            html += node.children.reduce((acc, item) => acc + this.renderNode(item), "");
            html += "</ul>";
        }

        html += "</li>";
        return html;

    },

    /**
     * Установка основных обработчиков событий
     */
    setEventHandlers() {

        document.getElementById("fv-sortInit").addEventListener('click', () => this.sort(0));
        document.getElementById("fv-sortAZ").addEventListener('click', () => this.sort(1));
        document.getElementById("fv-sortZA").addEventListener('click', () => this.sort(-1));
        document.getElementById("fv-filter").addEventListener('keyup', event => this.filter(event.target.value));
        this.getMountPoint().addEventListener('click', event => this.clickHandler(event));

    },

    /**
     * Сортировка дерева папок
     * @param {int} sortDirection Направление сортировки
     */
    sort(sortDirection) {
        this.settings.sortDirection = sortDirection;
        this.renderTree();
    },

    /**
     * Фильтрация дерева папок
     * @param {string} str Строка фильтрации папок
     */
    filter(str) {
        this.settings.filterStr = str;
        this.renderTree();
    },

    getMountPoint() {
        return document.getElementById(this.settings.appMountPoint);
    },

    /**
     * Построение дерева из исходных данных, с учетом сортировки и фильтрации
     * При построении дерева используется коллекция, для хранения детей элемента, для того, чтобы сформировать дерево
     * с одного прохода
     * Если найден элемент с id=-1 он назначается корневым элементом
     * Параллельно заполняем коллекцию содержащюю все id всех элементов
     */
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

    /**
     * Фильтрация сгенерированного дерева папок
     * В случае если папка соответствует фильтру, то все его родители также помечаются как соответствующие фильтру.
     */
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

    /**
     * Функция определяет соответствует ли элемент фильтру
     * @param {Object} node Проверяемый элемент дерева папок
     * @returns {boolean} Истина - соответствует фильтру, ложь - нет
     */
    filterNode(node) {
        return node.title.toLowerCase().includes(this.settings.filterStr.toLowerCase());
    },

    /**
     * Обработчик нажатия на элемент дерева папок, чтобы открыть или спрятать вложенные элементы
     * @param event Событие нажатия
     */
    clickHandler(event) {
        let target = event.target;
        if (target.classList.contains('fv-listItem') && target.firstElementChild && target.firstElementChild.nodeName === "UL") {
            target.firstElementChild.classList.toggle('hidden');
            target.classList.toggle('closed');
        }
    },


};

window.onload = appFolderView.init();