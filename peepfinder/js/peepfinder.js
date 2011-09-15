var qry = C9.api.query.queryString('*')
            .fields(['username^10', 'first^5', 'last^5', 'firstgrammed', 'lastgrammed', 'usernamegrammed', 'city', 'state', 'zip'])
            .useDisMax(true);

var fm = C9.api.filter.filterManager();

var stateFacet = C9.api.facet.termFacet("state").field("state").size(10).allTerms(true);
var sexFacet = C9.api.facet.termFacet("sex").field("sex").size(10).allTerms(true);

var cloud9 = C9.api.search.Search({
                    indices:['demos'], 
                    types:['people']
            })
            .addFacet(sexFacet)
            .addFacet(stateFacet);

var instantRunning = false;
var instantRequest;

var handleResults = function(results) {
    console.log(JSON.stringify(results));
    var all = $('#all').empty();
    var infobox = $('#maininfo').empty();
    var facets = $('#facets').empty();
    var pgr = $('.pager').empty();
    
    pager.hits(results.hits.total);
    
    $('#infoTmpl').tmpl({query: qry.query(), hits: results.hits.total}).appendTo(infobox);
    
    var facetNames = [];
    $.each(results.facets, function (k, v) {
        facetNames.push(k);
    });
    $('#facetsTmpl').tmpl({facets:results.facets,facetNames:facetNames, fm:fm}).appendTo(facets);
    
    if (results.hits.total === 0) {
        $('#noResultsTmpl').tmpl().appendTo(all);
    } else {
        $('#resultsTmpl').tmpl(results.hits.hits).appendTo(all);
        $('#pagerTmpl').tmpl({pager:pager}).appendTo(pgr);
    }
};

var pager = C9.api.search.Pager(cloud9, handleResults);

var addFacet = function(facet, term) {
    var tf = C9.api.filter.termFilter(facet, term);
    fm.add(tf, doFacetSearch);
}

var removeFacet = function(facet, term) {
    fm.remove(facet, term, doFacetSearch);
}

var doFacetSearch = function(facet, term, op) {
    cloud9.setQuery(fm.apply(qry)).from(0).get(handleResults);
};

var doInstantSearch = function(e) {
    e.preventDefault();
    var searchbox = $(this);
    var q = searchbox.val();
    
    if (q === '') {
        q = '*';
    }
    
    if (instantRunning) {
        instantRequest.abort();
    }
    
    fm.reset().apply(qry.query(q));
    instantRunning = true;
    instantRequest = cloud9.setQuery(qry).from(0).get(function(results) {
        handleResults(results);
        instantRunning = false;
    });
    
    return false;
};

cloud9.setQuery(qry).get(function(results) {
    $(document).ready(function() {
        handleResults(results);
    });  
});

$(document).ready(function() {
    $("#searchbox").keyup(doInstantSearch);
});
