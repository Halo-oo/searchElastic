
/* 생성한 변수 정리를 위한 파일 */

// @ multiSearch
/* 페이징을 위한 변수 선언 */
// 1) 마지막 게시글 sort값 저장을 위해 선언
//    - 다음 페이지로의 이동을 위하여 사용
let lastSortVaule;

// 2) size 값 선언 및 초기화
const pageNation = 10;

// 3) 사용자가 입력한 검색어 값 저장
let userSearchVaule;

// 4) 몇번째 page 인지 저장하기 위하여 선언
//    - /multiSearch, /multiDateSearch 동작 시 초기화 하고 있음
let currentPage;

// 5) pageNation에서 마지막 글을 판별하기 위하여 사용 & 초기화 작업
//    - /multiSearch, /multiDateSearch 동작 시 초기화 하고 있음
let tempCount;

// 6) 전체 sort값 저장을 위하여 선언
//    - /multiSearch, /multiDateSearch 동작 시 초기화 하고 있음
let totalLastSortValue = new Object();

// 7) 사용자가 선택한 정렬기준을 저장하기 위하여 선언
let userChoiceSortBy;

// @ multiDateSearch
// 시작일, 종료일을 저장하기 위한 object 선언
let userDateSearchValue = new Object();