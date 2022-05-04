const express = require('express');
const elasticsearch = require('../util/elasticClient')
const axios = require("axios");

const router = express.Router();

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
        }else {
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

module.exports = router;