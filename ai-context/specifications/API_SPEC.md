# API Specification


## Authentication


POST /api/auth/login


Request:

{
 "email":"",
 "password":""
}


Response:

{
 "accessToken":"",
 "refreshToken":""
}


---


## Machine


GET /api/machines


Response:


[
 {
  "id":"M001",
  "status":"RUN",
  "job":"JOB001"
 }
]