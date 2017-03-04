(function($) {
    // TODO: make the node ID configurable
    var treeNode = $('#jsdoc-toc-nav');

    // initialize the tree
    treeNode.tree({
        autoEscape: false,
        closedIcon: '&#x21e2;',
        data: [{"label":"@sugarcrm","id":"module:@sugarcrm","children":[{"label":"<a href=\"module-@sugarcrm_ventana.html\">ventana</a>","id":"module:@sugarcrm/ventana","children":[{"label":"<a href=\"module-@sugarcrm_ventana.html#~Api\">Api</a>","id":"module:@sugarcrm/ventana~Api","children":[]},{"label":"<a href=\"module-@sugarcrm_ventana.html#~HttpError\">HttpError</a>","id":"module:@sugarcrm/ventana~HttpError","children":[]},{"label":"<a href=\"module-@sugarcrm_ventana.html#~HttpRequest\">HttpRequest</a>","id":"module:@sugarcrm/ventana~HttpRequest","children":[]}]}]}],
        openedIcon: ' &#x21e3;',
        saveState: true,
        useContextMenu: false
    });

    // add event handlers
    // TODO
})(jQuery);
