const express = require('express');
const elasticsearch = require('../util/elasticClient')
const axios = require("axios");

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({extended: false}));

/* 페이징을 위한 변수 선언 */
// 1) 마지막 게시글 sort값 저장을 위해 선언
let lastSortVaule;
// 2) size 값 선언 및 초기화
const pageNation = 10;
// 3) 사용자가 입력한 검색어 값 저장
let userSearchVaule;
// 4) 몇번째 page 인지 저장하기 위하여 선언
let currentPage;
// 5) pageNation에서 마지막 글을 판별하기 위하여 사용 & 초기화 작업
let tempCount;
// 6) 전체 sort값 저장을 위하여 선언
let totalLastSortValue = new Object();
// 7) 사용자가 선택한 정렬기준을 저장하기 위하여 선언
let userChoiceSortBy;


/* 통합검색 */
// multi_match + highlight 사용
router.post('/multiSearch', async (req, res) => {
    console.log("#21# 통합검색 /multiSearch 동작");
    //console.log("#21# ejs에서 받아온 값 확인 > " + req.body.query);

    // (for 페이징) _전체 sort 값 저장 object 초기화
    totalLastSortValue = {};
    console.log("#21# /multiSearch 전체 sort 값을 저장하고 있는 object 초기화 > " + JSON.stringify(totalLastSortValue));

    // 기간 상세검색에 사용하는 시작일, 종료일을 저장하고 있는 object 초기화
    userDateSearchValue = {};
    console.log("#21# (for 페이징) /multiSearch 동작에 따른 userDateSearchValue 초기화 > " + JSON.stringify(userDateSearchValue));

    let a;
    let b;
    // 1) (if) 정렬기준을 최신순으로 선택 > 1차 update_dttm 최신 순 + 2차 score 높은 순으로 정렬
    if (req.body.sortby === "recent") {
        try {
            console.log("#21# /multiSearch 통합검색 + 최신순 정렬 검색 동작");

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        {"update_dttm": "desc"},
                        {"_score": "desc"}
                    ],
                    "track_scores": true,
                    "query": {
                        "multi_match": {
                            "query": req.body.query,
                            "fields": [
                                "reporter",
                                "title",
                                "content"
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
            userSearchVaule = req.body.query;
            userChoiceSortBy = req.body.sortby;

            // (for 페이징) _모든 sort값 저장을 위하여 별도의 search 문을 같이 동작
            b = await elasticsearch.search({
                //index: "practice",
                index: "html_remove_practice",
                body: {
                    "sort": [
                        {"update_dttm": "desc"},
                        {"_score": "desc"}
                    ],
                    "query": {
                        "multi_match": {
                            "query": req.body.query,
                            "fields": [
                                "reporter",
                                "title",
                                "content"
                            ]
                        }
                    },
                    "size": a.hits.total.value + 1
                }
            });

        } catch (e) {
            console.log("#21# /multiSearch *최신순 정렬 + 검색* try..catch문 Error 발생 " + e);
        }

    // 1-1) (else if) 과거순 정렬 > > 1차 update_dttm 과거순 + 2차 score 높은 순으로 정렬
    } else if (req.body.sortby === "past") {
        try {
            console.log("#21# /multiSearch 통합검색 + 과거순 정렬 검색 동작");

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "update_dttm": "asc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "multi_match": {
                            "query": req.body.query,
                            "fields": [
                                "reporter",
                                "title",
                                "content"
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "title": {},
                            "reporter": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
            userSearchVaule = req.body.query;
            userChoiceSortBy = req.body.sortby;

            // (for 페이징) _모든 sort값 저장을 위하여 별도의 search 문을 같이 동작
            b = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        {"update_dttm": "asc"},
                        {"_score": "desc"}
                    ],
                    "query": {
                        "multi_match": {
                            "query": req.body.query,
                            "fields": [
                                "reporter",
                                "title",
                                "content"
                            ]
                        }
                    },
                    "size": a.hits.total.value + 1
                }
            });

        } catch (e) {
            console.log("#21# /multiSearch *과거순 정렬 + 검색* try..catch문 Error 발생 " + e);
        }

    // 1-2) 별도의 정렬기준이 없을 시 default 로 score 순으로 정렬
    }else {
        try {
            console.log("#21# /multiSearch 통합검색 + 정확도순 정렬 검색 동작");

            a =  await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "_score": "desc" },
                        { "id": "asc" }
                    ],
                    "track_scores" : true,
                    "query": {
                        "multi_match": {
                            "query": req.body.query,
                            "fields": [
                                "reporter",
                                "title",
                                "content"
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
            userChoiceSortBy = null;
            userSearchVaule = req.body.query;

            // (for 페이징) _모든 sort값 저장을 위하여 별도의 search 문을 같이 동작
            b =  await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "_score": "desc" },
                        { "id": "asc" }
                    ],
                    "query": {
                        "multi_match": {
                            "query": req.body.query,
                            "fields": [
                                "reporter",
                                "title",
                                "content"
                            ]
                        }
                    },
                    "size": a.hits.total.value + 1
                }
            });

        }catch (e) {
            console.log("#21# /multiSearch *정확도 정렬 + 검색* try..catch문 Error 발생 " + e);
        }
    }

    /* (for 페이징) _전체 검색결과 글의 마지막 부분 sort 값 저장하기*/
    const tempPage = b.hits.hits;
    tempPage.forEach(function (item, index, resultArray) {
        // 페이징, search-after 사용을 위하여 마지막 글의 sort 값 확인 및 저장
        if ((index + 1) % pageNation === 0) {
            totalLastSortValue[index + 1] = item.sort;
        }
    });
    console.log("#21# /multiSearch size 단위의 게시글 total sort값 확인 및 저장 > " + JSON.stringify(totalLastSortValue));


    /* 검색결과 format */
    const result = a.hits.hits;
    let resultList = new Array();

    // (for 통계값 출력)
    let tempAggs = new Object();
    tempAggs.explain = "검색 소요시간 & 검색된 글의 총 개수";

    // (for 페이징) _tempCount 값 초기화
    tempCount = 0;
    // (for 페이징) _currentPage 값 초기화
    currentPage = 1;

    // 통계값 출력
    // took = 걸린 시간, total.value = 검색된 글의 총 개수
    try{
        tempAggs.time = (a.took) / 1000 + "초";
        tempAggs.total = a.hits.total.value + "개";
        tempAggs.max_score = a.hits.max_score;

        if (userChoiceSortBy == "recent") {
            tempAggs.sortBy = "최신순 정렬";
        }else if (userChoiceSortBy == "past") {
            tempAggs.sortBy = "과거순 정렬";
        }else {
            tempAggs.sortBy = "정확도순 정렬";
        }
        resultList.push(tempAggs);

    }catch (e) {
        console.log("#21# /multiSearch 통계값 출력 part Error 발생");
        resultList.push("/multiSearch 통계 Error 발생");
    }

    result.forEach(function (item, index, resultArray) {
       const tempObject = new Object();

       tempObject.index = index + 1;
       tempObject.nid = item._source.nid;
       tempObject.category = item._source.category;
       tempObject.update_dttm = item._source.update_dttm;
       tempObject.score = item._score;

       // reporter 하이라이팅
       if (item.highlight.reporter != null) {
           tempObject.reporter = item.highlight.reporter;
       }else {
           tempObject.reporter = item._source.reporter;
       }

       // title 하이라이팅
        if (item.highlight.title != null) {
            tempObject.title = item.highlight.title;
        }else {
            tempObject.title = item._source.title;
        }

       // content 내용 2-3줄만 나오도록 + 하이라이팅
        if (item.highlight.content != null) {
            tempObject.content = item.highlight.content;
        }else {
            tempObject.content = item._source.content.substring(0, 100);
        }

        // (for 페이징) _search-after 사용을 위하여 마지막 글의 sort 값 확인 및 저장
        if (index + 1 == result.length) {
            //tempObject.sort = item.sort;
            lastSortVaule = item.sort;
            //console.log("#21# /multiSearch 페이징을 위한 마지막 글 sort값 확인 > " + lastSortVaule);
        }

        resultList.push(tempObject);
    });

    res.send(resultList);
})





/* 기간 상세검색 */
let userDateSearchValue = new Object();
router.post('/multiSearchDate', async (req, res) => {
    console.log("#21# 기간 상세검색 /multiDateSearch 동작");

    // (for 페이징) _전체 sort 값 저장 object 초기화
    totalLastSortValue = {};
    console.log("#21# /multiDateSearch 전체 sort 값을 저장하고 있는 object 초기화 > " + JSON.stringify(totalLastSortValue));

    let a;
    let b;
    // 1) (if) 최신순 정렬
    if (req.body.sortby === "recent") {
        try {
            console.log("#21# /multiDateSearch 기간검색 + 최신순 정렬 검색 동작");

            // 검색 조건: 최신순 정렬 + 검색어 포함 + 기간 이내 글
            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "update_dttm": "desc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": req.body.query,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": req.body.start_date,
                                            "lte": req.body.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });

            userSearchVaule = req.body.query;
            userChoiceSortBy = req.body.sortby;
            userDateSearchValue.start_date = req.body.start_date;
            userDateSearchValue.end_date = req.body.end_date;
            //console.log("#21# 시작일, 종료일 확인 > " + JSON.stringify(userDateSearchValue));

            // (for 페이징) _모든 sort값 저장을 위하여 별도의 search 문을 같이 동작
            b = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "update_dttm": "desc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": req.body.query,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": req.body.start_date,
                                            "lte": req.body.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "size": a.hits.total.value + 1
                }
            });

        }catch (e) {
            console.log("#21# /multiDateSearch *최신순 정렬 + 기간검색* try..catch 문 Error 발생 " + e);
        }

    // 2) (else if) 과거순 정렬 
    }else if (req.body.sortby === "past") {
        try {
            console.log("#21# /multiDateSearch 기간검색 + 과거순 정렬 검색 동작");

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "update_dttm": "asc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": req.body.query,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": req.body.start_date,
                                            "lte": req.body.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
            userSearchVaule = req.body.query;
            userChoiceSortBy = req.body.sortby;
            userDateSearchValue.start_date = req.body.start_date;
            userDateSearchValue.end_date = req.body.end_date;

            // (for 페이징) _모든 sort값 저장을 위하여 별도의 search 문을 같이 동작
            b = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "update_dttm": "asc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": req.body.query,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": req.body.start_date,
                                            "lte": req.body.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "size": a.hits.total.value + 1
                }
            });

        }catch (e) {
            console.log("#21# /multiDateSearch *과거순 정렬 + 기간검색* try..catch 문 Error 발생 " + e);
        }

    // 3) (else) 정확도 정렬
    }else {
        try {
            console.log("#21# /multiDateSearch 기간검색 + 정확도순 정렬 검색 동작");

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "_score": "desc" },
                        { "id": "asc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": req.body.query,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": req.body.start_date,
                                            "lte": req.body.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
            userSearchVaule = req.body.query;
            userChoiceSortBy = req.body.sortby;
            userDateSearchValue.start_date = req.body.start_date;
            userDateSearchValue.end_date = req.body.end_date;

            // (for 페이징) _모든 sort값 저장을 위하여 별도의 search 문을 같이 동작
            b = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "sort": [
                        { "_score": "desc" },
                        { "id": "asc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": req.body.query,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": req.body.start_date,
                                            "lte": req.body.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "size": a.hits.total.value + 1
                }
            });

        }catch (e) {
            console.log("#21# /multiDateSearch : " + JSON.stringify(e));
        }
    }

    // (for 페이징) _전체 검색결과 글의 마지막 부분 sort 값 저장
    const tempPage = b.hits.hits;
    tempPage.forEach(function (item, index, resultArray) {
        if ((index + 1) % pageNation === 0) {
            totalLastSortValue[index + 1] = item.sort;
        }
    });
    console.log("#21# /multiDateSearch size 단위의 게시글 total sort값 확인 및 저장 > " + JSON.stringify(totalLastSortValue));

    /* 검색결과 format */
    const result = a.hits.hits;
    let resultList = new Array();

    // (for 통계값 출력)
    let tempAggs = new Object();
    tempAggs.explain = "검색 소요시간 & 검색된 글의 총 개수";

    // (for 페이징) _tempCount 값 초기화
    tempCount = 0;
    // (for 페이징) _currentPage 값 초기화
    currentPage = 1;

    // 통계값 출력
    try {
        tempAggs.time = (a.took) / 1000 + "초";
        tempAggs.total = a.hits.total.value + "개";
        tempAggs.max_score = a.hits.max_score;

        if (userChoiceSortBy == "recent") {
            tempAggs.sortBy = "최신순 정렬";
        }else if (userChoiceSortBy == "past") {
            tempAggs.sortBy = "과거순 정렬";
        }else {
            tempAggs.sortBy = "정확도순 정렬";
        }
        resultList.push(tempAggs);

    }catch (e) {
        console.log("#21# /multiDateSearch 통계값 출력 try..catch 문 Error 발생" + e);
        resultList.push("/multiDateSearch 통계 Error 발생");
    }

    result.forEach(function (item, index, resultArray) {
        let tempObject = new Object();

        tempObject.index = index + 1;
        tempObject.nid = item._source.nid;
        tempObject.category = item._source.category;
        tempObject.update_dttm = item._source.update_dttm;
        tempObject.score = item._score;

        // reporter 하이라이팅
        if (item.highlight.reporter != null) {
            tempObject.reporter = item.highlight.reporter;
        }else {
            tempObject.reporter = item._source.reporter;
        }

        // title 하이라이팅
        if (item.highlight.title != null) {
            tempObject.title = item.highlight.title;
        }else {
            tempObject.title = item._source.title;
        }

        // content 내용 2-3줄만 나오도록 + 하이라이팅
        if (item.highlight.content != null) {
            tempObject.content = item.highlight.content;
        }else {
            tempObject.content = item._source.content.substring(0, 100);
        }

        // (for 페이징) _search-after 사용을 위하여 마지막 글의 sort 값 확인 및 저장
        if (index + 1 == result.length) {
            lastSortVaule = item.sort;
            //console.log("#21# /multiDateSearch 페이징을 위한 마지막 글 sort값 확인 > " + lastSortVaule);
        }

        resultList.push(tempObject);
    });

    res.send(resultList);
})





/* 페이징 (통합검색 용) */
// search-after 사용
router.post('/pageNation', async (req, res) => {
   //console.log("#21# 페이징 /pageNation 동작 __저장되어 있는 sort값 확인 > " + lastSortVaule.toString());

    var a;

   // 1페이지의 경우 /multiSearch router를 동작
    if (req.body.page == "1") {

        if (userChoiceSortBy == null) {
            userChoiceSortBy = "null";
        }

        axios({
            url: 'http://localhost:4040/multiSearch',
            method: 'post',
            data: {
                query: userSearchVaule.toString(),
                sortby: userChoiceSortBy.toString()
            }
        }).then(function (response){
            res.send(response.data);
        });
    }
    else if (req.body.page != null) {// 1) (else if) 페이지 이동을 위한 parameter값이 있다면 > 해당 페이지 보여주기

        // object key 값 설정
       let tempObjectNum = (req.body.page - 1) * pageNation;
       // console.log("#21# 선택한 페이지에 따른 object key 값 확인 > " + tempObjectNum);

       // ️현재 페이지 위치 조정 > ex. 4 페이지면 31번으로 설정
       currentPage = req.body.page - 1;
       tempCount = (req.body.page - 1) * pageNation + 1;

       // 1-1) (if) 최신순 정렬
       if (userChoiceSortBy === "recent") {
           console.log("#21# /pageNation 해당 번호의 페이지로 이동 동작 + 최신순 정렬");
           console.log("#21# /pageNation 선택한 페이지 > " + (parseInt(tempObjectNum / pageNation) + 1));

           a = await elasticsearch.search({
               index: "html_remove_practice",
               body: {
                   "search_after": [
                       totalLastSortValue[tempObjectNum][0].toString(), totalLastSortValue[tempObjectNum][1]
                   ],
                   "sort": [
                       {"update_dttm": "desc"},
                       {"_score": "desc"}
                   ],
                   "track_scores": true,
                   "query": {
                       "multi_match": {
                           "query": userSearchVaule,
                           "fields": [
                               "reporter",
                               "title",
                               "content"
                           ]
                       }
                   },
                   "highlight": {
                       "pre_tags": "<strong style='color: #FFC300'>",
                       "post_tags": "</strong>",
                       "fields": {
                           "title": {},
                           "reporter": {},
                           "content": {}
                       }
                   },
                   "size": pageNation
               }
           });
           //currentPage = req.body.page - 1;

       // 1-2) 과거순
       }else if (userChoiceSortBy === "past") {
           console.log("#21# /pageNation 해당 번호의 페이지로 이동 동작 + 과거순 정렬");
           console.log("#21# /pageNation 선택한 페이지 > " + (parseInt(tempObjectNum / pageNation) + 1));

           a = await elasticsearch.search({
               index: "html_remove_practice",
               body: {
                   "search_after": [
                       totalLastSortValue[tempObjectNum][0].toString(), totalLastSortValue[tempObjectNum][1]
                   ],
                   "sort": [
                       { "update_dttm": "asc" },
                       { "_score": "desc" }
                   ],
                   "track_scores": true,
                   "query": {
                       "multi_match": {
                           "query": userSearchVaule,
                           "fields": [
                               "reporter",
                               "title",
                               "content"
                           ]
                       }
                   },
                   "highlight": {
                       "pre_tags": "<strong style='color: #FFC300'>",
                       "post_tags": "</strong>",
                       "fields": {
                           "title": {},
                           "reporter": {},
                           "content": {}
                       }
                   },
                   "size": pageNation
               }
           });
           //currentPage = req.body.page - 1;

       // 1-3) 정확도순
       }else if (userChoiceSortBy == null) {
           console.log("#21# /pageNation 해당 번호의 페이지로 이동 동작 + 정확도순 정렬");
           console.log("#21# /pageNation 선택한 페이지 > " + (parseInt(tempObjectNum/pageNation) + 1));

           a =  await elasticsearch.search({
               index: "html_remove_practice",
               body: {
                   "search_after": [
                       totalLastSortValue[tempObjectNum][0].toString(), totalLastSortValue[tempObjectNum][1]
                   ],
                   "sort": [
                       { "_score": "desc" },
                       { "id": "asc" }
                   ],
                   "track_scores" : true,
                   "query": {
                       "multi_match": {
                           "query": userSearchVaule,
                           "fields": [
                               "reporter",
                               "title",
                               "content"
                           ]
                       }
                   },
                   "highlight": {
                       "pre_tags": "<strong style='color: #FFC300'>",
                       "post_tags": "</strong>",
                       "fields": {
                           "title": {},
                           "reporter": {},
                           "content": {}
                       }
                   },
                   "size": pageNation
               }
           });
           //currentPage = req.body.page - 1;
       }

   // 2) (else) 페이지 이동, 그 다음 페이지 보여주기
   }else {
       // 2-1) 최신순 정렬
       if (userChoiceSortBy === "recent") {
           console.log("#21# /pageNation next 페이지로 이동 동작 + 최신순 정렬");
           console.log("#21# /pageNation 현재 페이지 > " + currentPage);

           a = await elasticsearch.search({
               index: "html_remove_practice",
               body: {
                   "search_after": [
                       lastSortVaule[0].toString(), lastSortVaule[1]
                   ],
                   "sort": [
                       {"update_dttm": "desc"},
                       {"_score": "desc"}
                   ],
                   "track_scores": true,
                   "query": {
                       "multi_match": {
                           "query": userSearchVaule,
                           "fields": [
                               "reporter",
                               "title",
                               "content"
                           ]
                       }
                   },
                   "highlight": {
                       "pre_tags": "<strong style='color: #FFC300'>",
                       "post_tags": "</strong>",
                       "fields": {
                           "title": {},
                           "reporter": {},
                           "content": {}
                       }
                   },
                   "size": pageNation
               }
           });

       // 2-2) 과거순 정렬
       }else if (userChoiceSortBy === "past") {
           console.log("#21# /pageNation next 페이지로 이동 동작 + 과거순 정렬");
           console.log("#21# /pageNation 현재 페이지 > " + currentPage);

           a = await elasticsearch.search({
               index: "html_remove_practice",
               body: {
                   "search_after": [
                       lastSortVaule[0].toString(), lastSortVaule[1]
                   ],
                   "sort": [
                       { "update_dttm": "asc" },
                       { "_score": "desc" }
                   ],
                   "track_scores": true,
                   "query": {
                       "multi_match": {
                           "query": userSearchVaule,
                           "fields": [
                               "reporter",
                               "title",
                               "content"
                           ]
                       }
                   },
                   "highlight": {
                       "pre_tags": "<strong style='color: #FFC300'>",
                       "post_tags": "</strong>",
                       "fields": {
                           "title": {},
                           "reporter": {},
                           "content": {}
                       }
                   },
                   "size": pageNation
               }
           });

       // 2-3) 정확도순 정렬
       }else {
           console.log("#21# /pageNation next 페이지로 이동 동작 + 정확도순 정렬");
           console.log("#21# /pageNation 현재 페이지 > " + currentPage);

           a =  await elasticsearch.search({
               index: "html_remove_practice",
               body: {
                   "search_after": [
                       lastSortVaule[0].toString(), lastSortVaule[1]
                   ],
                   "sort": [
                       { "_score": "desc" },
                       { "id": "asc" }
                   ],
                   "track_scores" : true,
                   "query": {
                       "multi_match": {
                           "query": userSearchVaule,
                           "fields": [
                               "reporter",
                               "title",
                               "content"
                           ]
                       }
                   },
                   "highlight": {
                       "pre_tags": "<strong style='color: #FFC300'>",
                       "post_tags": "</strong>",
                       "fields": {
                           "title": {},
                           "reporter": {},
                           "content": {}
                       }
                   },
                   "size": pageNation
               }
           });
       }
   }


    if (req.body.page != "1"){
        /* 검색결과 format */
        const result = a.hits.hits;
        let resultList = new Array();

        // 통계값 출력
        // took = 걸린 시간, total.value = 검색된 글의 총 개수
        let tempAggs = new Object();
        tempAggs.explain = "검색 소요시간 & 검색된 글의 총 개수";

        try{
            tempAggs.time = (a.took) / 1000 + "초";
            tempAggs.total = a.hits.total.value + "개";
            tempAggs.max_score = a.hits.max_score;

            if (userChoiceSortBy == "recent") {
                tempAggs.sortBy = "최신순 정렬";
            }else if (userChoiceSortBy == "past") {
                tempAggs.sortBy = "과거순 정렬";
            }else {
                tempAggs.sortBy = "정확도순 정렬";
            }
            resultList.push(tempAggs);

        }catch (e) {
            console.log("#21# /multiSearch 통계값 출력 part Error 발생");
            resultList.push("/multiSearch 통계 Error 발생");
        }

        // (if) 검색결과 마지막 글 출력 후 더이상 글이 나오지 않게 하기
        // console.log("#21# /pageNation 마지막 글 확인 __tempCount(현재 index값) vs total(마지막 글) 비교 확인 > " + tempCount, a.hits.total.value);
        if (tempCount + 1 >= a.hits.total.value + 1 || result.length == 0) {
            console.log("#21# !검색된 글 끝 __/pageNation 문구 출력 동작");
            resultList.push("검색 조건의 글이 더 이상 없습니다.");
            // (else) 마지막 글이 아닐 경우 정상 출력
        }else {
            result.forEach(function (item, index, resultArray) {
                const tempObject = new Object();

                tempObject.index = index + 1 + pageNation * currentPage;
                tempCount = index + 1 + pageNation * currentPage;
                //console.log("#21# /pageNation tempCount 값 확인 > " + tempCount);

                tempObject.nid = item._source.nid;
                tempObject.category = item._source.category;
                tempObject.update_dttm = item._source.update_dttm;
                tempObject.score = item._score;

                // reporter 하이라이팅
                if (item.highlight.reporter != null) {
                    tempObject.reporter = item.highlight.reporter;
                }else {
                    tempObject.reporter = item._source.reporter;
                }

                // title 하이라이팅
                if (item.highlight.title != null) {
                    tempObject.title = item.highlight.title;
                }else {
                    tempObject.title = item._source.title;
                }

                // content 내용 2-3줄만 나오도록 + 하이라이팅
                if (item.highlight.content != null) {
                    tempObject.content = item.highlight.content;
                }else {
                    tempObject.content = item._source.content.substring(0, 100);
                }

                // 페이징, search-after 사용을 위하여 마지막 글의 sort 값 확인 및 저장
                if (index + 1 == pageNation) {
                    //tempObject.sort = item.sort;
                    lastSortVaule = item.sort;
                    //console.log("#21# /pageNation 페이징을 위한 마지막 글 sort값 확인 > " + lastSortVaule);
                }

                resultList.push(tempObject);
            });
        }

        currentPage += 1;
        res.send(resultList);
    }
});



/* 페이징 (기간 상세검색 용) */
router.post('/pageNationDate', async (req, res) => {

    let a;

    // 1페이지의 경우 /multiSearchDate router를 동작
    if (req.body.page == "1") {
        if (userChoiceSortBy == null) {
            userChoiceSortBy = "null";
        }

        axios({
            url: 'http://localhost:4040/multiSearchDate',
            method: 'post',
            data: {
                query: userSearchVaule.toString(),
                sortby: userChoiceSortBy.toString(),
                start_date: userDateSearchValue.start_date,
                end_date: userDateSearchValue.end_date
            }
        }).then(function (response){
            res.send(response.data);
        });

    // 1) (else if) 페이지 이동을 위한 parameter 값이 있다면 > 해당 페이지 보여주기
    }else if (req.body.page != null) {

        let tempObjectNum = (req.body.page - 1) * pageNation;
        //console.log("#21# 선택한 페이지에 따른 object key 값 확인 > " + tempObjectNum);

        // 현재 페이지 위치 조정
        currentPage = req.body.page - 1;
        tempCount = (req.body.page - 1) * pageNation + 1;

        // 1-1) (if) 최신순 정렬
        if (userChoiceSortBy === "recent") {
            console.log("#21# /pageNationDate 해당 번호의 페이지로 이동 동작 + 최신순 정렬");
            console.log("#21# /pageNationDate 선택한 페이지 > " + (parseInt(tempObjectNum / pageNation) + 1));

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "search_after": [
                      totalLastSortValue[tempObjectNum][0].toString(), totalLastSortValue[tempObjectNum][1]
                    ],
                    "sort": [
                        { "update_dttm": "desc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": userSearchVaule,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": userDateSearchValue.start_date,
                                            "lte": userDateSearchValue.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });

        // 1-2) 과거순 정렬
        }else if (userChoiceSortBy === "past") {
            console.log("#21# /pageNationDate 해당 번호의 페이지로 이동 동작 + 과거순 정렬");
            console.log("#21# /pageNationDate 선택한 페이지 > " + (parseInt(tempObjectNum / pageNation) + 1));

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "search_after": [
                        totalLastSortValue[tempObjectNum][0].toString(), totalLastSortValue[tempObjectNum][1]
                    ],
                    "sort": [
                        { "update_dttm": "asc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": userSearchVaule,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": userDateSearchValue.start_date,
                                            "lte": userDateSearchValue.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });

        // 1-3) 정확도순
        }else {
            console.log("#21# /pageNationDate 해당 번호의 페이지로 이동 동작 + 정확도순 정렬");
            console.log("#21# /pageNationDate 선택한 페이지 > " + (parseInt(tempObjectNum / pageNation) + 1));

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "search_after": [
                        totalLastSortValue[tempObjectNum][0].toString(), totalLastSortValue[tempObjectNum][1]
                    ],
                    "sort": [
                        { "_score": "desc" },
                        { "id": "asc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": userSearchVaule,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": userDateSearchValue.start_date,
                                            "lte": userDateSearchValue.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
        }

    // 2) (else) 페이지 이동, 그 다음 페이지 보여주기
    }else {
        // 2-1) (if) 최신순 정렬
        if (userChoiceSortBy === "recent") {
            console.log("#21# /pageNationDate next 페이지로 이동 동작 + 최신순 정렬");
            console.log("#21# /pageNationDate 현재 페이지 > " + currentPage);

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "search_after": [
                        lastSortVaule[0].toString(), lastSortVaule[1]
                    ],
                    "sort": [
                        { "update_dttm": "desc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": userSearchVaule,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": userDateSearchValue.start_date,
                                            "lte": userDateSearchValue.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });

        // 2-2) (else if) 과거순 정렬
        }else if (userChoiceSortBy === "past") {
            console.log("#21# /pageNationDate next 페이지로 이동 동작 + 과거순 정렬");
            console.log("#21# /pageNationDate 현재 페이지 > " + currentPage);

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "search_after": [
                        lastSortVaule[0].toString(), lastSortVaule[1]
                    ],
                    "sort": [
                        { "update_dttm": "asc" },
                        { "_score": "desc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": userSearchVaule,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": userDateSearchValue.start_date,
                                            "lte": userDateSearchValue.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });

        // 2-3) (else) 정확도순 정렬
        }else {
            console.log("#21# /pageNationDate next 페이지로 이동 동작 + 정확도순 정렬");
            console.log("#21# /pageNationDate 현재 페이지 > " + currentPage);

            a = await elasticsearch.search({
                index: "html_remove_practice",
                body: {
                    "search_after": [
                        lastSortVaule[0].toString(), lastSortVaule[1]
                    ],
                    "sort": [
                        { "_score": "desc" },
                        { "id": "asc" }
                    ],
                    "track_scores": true,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": userSearchVaule,
                                        "fields": [ "reporter", "title", "content" ]
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "range": {
                                        "update_dttm": {
                                            "gte": userDateSearchValue.start_date,
                                            "lte": userDateSearchValue.end_date
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "highlight": {
                        "pre_tags": "<strong style='color: #FFC300'>",
                        "post_tags": "</strong>",
                        "fields": {
                            "reporter": {},
                            "title": {},
                            "content": {}
                        }
                    },
                    "size": pageNation
                }
            });
        }
    }

    if (req.body.page != "1") {
        /* 검색결과 format */
        const result = a.hits.hits;
        let resultList = new Array();

        // 통계값 출력
        let tempAggs = new Object();
        tempAggs.explain = "검색 소요시간 & 검색된 글의 총 개수";

        try {
            tempAggs.time = (a.took) / 1000 + "초";
            tempAggs.total = a.hits.total.value + "개";
            tempAggs.max_score = a.hits.max_score;

            if (userChoiceSortBy == "recent") {
                tempAggs.sortBy = "최신순 정렬";
            }else if (userChoiceSortBy == "past") {
                tempAggs.sortBy = "과거순 정렬";
            }else {
                tempAggs.sortBy = "정확도순 정렬";
            }
            resultList.push(tempAggs);

        }catch (e) {
            console.log("#21# /pageNationDate 통계값 출력 try..catch 문 Error 발생" + e);
            resultList.push("/pageNationDate 통계 Error 발생");
        }

        // (if) 검색결과 마지막 글 출력 후 더이상 글이 나오지 않게 하기
        if (tempCount + 1 >= a.hits.total.value + 1 || result.length == 0) {
            console.log("#21# !검색된 글 끝 __/pageNationDate 문구 출력 동작");
            resultList.push("검색 조건의 글이 더 이상 없습니다.");

            // (else) 마지막 글이 아닐 경우 정상 출력
        }else {
            result.forEach(function (item, index, resultArray) {
                let tempObject = new Object();

                tempObject.index = index + 1 + pageNation * currentPage;
                tempCount = index + 1 + pageNation * currentPage;

                tempObject.nid = item._source.nid;
                tempObject.category = item._source.category;
                tempObject.update_dttm = item._source.update_dttm;
                tempObject.score = item._score;

                // reporter 하이라이팅
                if (item.highlight.reporter != null) {
                    tempObject.reporter = item.highlight.reporter;
                }else {
                    tempObject.reporter = item._source.reporter;
                }

                // title 하이라이팅
                if (item.highlight.title != null) {
                    tempObject.title = item.highlight.title;
                }else {
                    tempObject.title = item._source.title;
                }

                // content 내용 2-3줄만 나오도록 + 하이라이팅
                if (item.highlight.content != null) {
                    tempObject.content = item.highlight.content;
                }else {
                    tempObject.content = item._source.content.substring(0, 100);
                }

                // 페이징, search_after 사용을 위하여 마지막 글의 sort 값 확인 및 저장
                if (index + 1 == pageNation) {
                    lastSortVaule = item.sort;
                    //console.log("#21# /pageNationDate 페이징을 위한 마지막 글 sort 값 확인 > " + lastSortVaule);
                }

                resultList.push(tempObject);
            });
        }

        currentPage += 1;
        res.send(resultList);
    }
});

/* 통합검색 __하이라이트 확인용 + EJS(view engine) */
router.post('/multiSearchEjs', async (req, res) => {
    console.log("#21# 통합검색 + EJS /multiSearchEjs 동작");
    //console.log("#21# ejs에서 받아온 값 확인 > " + req.body.query);

    let a;
    try {
        console.log("#21# /multiSearchEjs 통합검색 + 정확도순 정렬 + EJS 검색 동작");

        a =  await elasticsearch.search({
            index: "html_remove_practice",
            body: {
                "sort": [
                    { "_score": "desc" },
                    { "id": "asc" }
                ],
                "track_scores" : true,
                "query": {
                    "multi_match": {
                        "query": req.body.query,
                        "fields": [
                            "reporter",
                            "title",
                            "content"
                        ]
                    }
                },
                "highlight": {
                    "pre_tags": "<strong style='color: #FFC300'>",
                    "post_tags": "</strong>",
                    "fields": {
                        "reporter": {},
                        "title": {},
                        "content": {}
                    }
                },
                "size": 100
            }
        });
        userChoiceSortBy = null;
        userSearchVaule = req.body.query;

    }catch (e) {
        console.log("#21# /multiSearchEjs *정확도 정렬 + 검색 + EJS* try..catch문 Error 발생 " + e);
    }

    /* 검색결과 format */
    const result = a.hits.hits;
    //console.log("#21# /multiSearchEjs EJS로 보낼 검색결과 확인 > " + JSON.stringify(result));

    res.render("resultList" , {data: result, search: userSearchVaule} );
});


/* EJS index */
router.get('/', function(req, res, next) {
    res.render('index.ejs');
});

module.exports = router;
