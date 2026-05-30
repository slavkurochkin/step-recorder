I'm recording steps when interacting with web application, I want create another application that will create user journey map, lets think how we can do it. Here is an example of steps recorded

{
  "timestamp": "2026-05-30T15:56:14.816Z",
  "steps": [
    {
      "type": "pageload",
      "timestamp": 1780156443624,
      "tagName": "browser",
      "selector": "",
      "text": "React App",
      "url": "http://localhost:3000/authform"
    },
    {
      "type": "input",
      "timestamp": 1780156446030,
      "tagName": "input",
      "selector": "#authform_email",
      "selectorAlternatives": [
        {
          "label": "id",
          "selector": "#authform_email"
        },
        {
          "label": "placeholder",
          "selector": "[placeholder=\"email address\"]"
        },
        {
          "label": "class",
          "selector": ".ant-input.ant-input-lg.css-qnu6hi"
        }
      ],
      "text": "",
      "value": "admin@instaverse.com",
      "inputType": "email"
    },
    {
      "type": "input",
      "timestamp": 1780156446033,
      "tagName": "input",
      "selector": "#authform_password",
      "selectorAlternatives": [
        {
          "label": "id",
          "selector": "#authform_password"
        },
        {
          "label": "placeholder",
          "selector": "[placeholder=\"password\"]"
        },
        {
          "label": "class",
          "selector": ".ant-input.ant-input-lg.css-qnu6hi"
        }
      ],
      "text": "",
      "value": "admin123",
      "inputType": "password"
    },
    {
      "type": "click",
      "timestamp": 1780156446143,
      "tagName": "span",
      "selector": "div.ant-row > div.ant-col > div.ant-form-item-control-input > div.ant-form-item-control-input-content > button.ant-btn:nth-child(1) > span",
      "selectorAlternatives": [
        {
          "label": "css path",
          "selector": "div.ant-row > div.ant-col > div.ant-form-item-control-input > div.ant-form-item-control-input-content > button.ant-btn:nth-child(1) > span"
        }
      ],
      "text": "Log In",
      "x": 749,
      "y": 350,
      "button": 0
    },
    {
      "type": "click",
      "timestamp": 1780156464355,
      "tagName": "svg",
      "selector": "header.ant-layout-header:nth-child(1) > div:nth-child(2) > button.ant-btn:nth-child(2) > span.ant-btn-icon:nth-child(1) > span.anticon > svg",
      "selectorAlternatives": [
        {
          "label": "css path",
          "selector": "header.ant-layout-header:nth-child(1) > div:nth-child(2) > button.ant-btn:nth-child(2) > span.ant-btn-icon:nth-child(1) > span.anticon > svg"
        }
      ],
      "text": "",
      "x": 1629,
      "y": 52,
      "button": 0
    },
    {
      "type": "click",
      "timestamp": 1780156465914,
      "tagName": "span",
      "selector": ".ant-dropdown-menu-title-content",
      "selectorAlternatives": [
        {
          "label": "class",
          "selector": ".ant-dropdown-menu-title-content"
        }
      ],
      "text": "Profile",
      "x": 1646,
      "y": 131,
      "button": 0
    }
  ],
  "networkRequests": [
    {
      "type": "network",
      "timestamp": 1780156446153,
      "method": "OPTIONS",
      "url": "http://localhost:8000/api/auth/login",
      "status": 204,
      "statusText": "No Content",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "*/*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Access-Control-Request-Headers",
          "value": "content-type,traceparent,x-session-id"
        },
        {
          "name": "Access-Control-Request-Method",
          "value": "POST"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        }
      ],
      "requestBody": null,
      "responseBody": "",
      "duration": 5,
      "tagName": "network",
      "selector": "",
      "text": "OPTIONS http://localhost:8000/api/auth/login"
    },
    {
      "type": "network",
      "timestamp": 1780156446288,
      "method": "POST",
      "url": "http://localhost:8000/api/auth/login",
      "status": 200,
      "statusText": "OK",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "application/json, text/plain, */*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Content-Length",
          "value": "54"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        },
        {
          "name": "sec-ch-ua",
          "value": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\""
        },
        {
          "name": "sec-ch-ua-mobile",
          "value": "?0"
        },
        {
          "name": "sec-ch-ua-platform",
          "value": "\"macOS\""
        },
        {
          "name": "traceparent",
          "value": "00-2155a9e6b1ce116a8937fd15a053ef88-b1112e33cb3e0156-01"
        },
        {
          "name": "x-session-id",
          "value": "e54e2ccb-fd84-400d-869a-649312fddde7"
        }
      ],
      "requestBody": "{\"email\":\"admin@instaverse.com\",\"password\":\"admin123\"}",
      "responseBody": "{\"message\":\"Login successful\",\"token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AaW5zdGF2ZXJzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODAxNTY0NDYsImV4cCI6MTc4MDc2MTI0Nn0.5aCCde6QrMqbSZNVRuLZj8Vi1mLtbG4_NgixwEhK3ao\",\"result\":{\"_id\":1,\"username\":\"admin\",\"email\":\"admin@instaverse.com\",\"role\":\"admin\",\"age\":null,\"gender\":null,\"bio\":\"System Administrator\",\"favorite_style\":null,\"total_posts\":1,\"created_at\":\"2025-12-22T03:39:31.654Z\",\"updated_at\":\"2025-12-22T03:39:31.654Z\"}}",
      "duration": 93,
      "tagName": "network",
      "selector": "",
      "text": "POST http://localhost:8000/api/auth/login"
    },
    {
      "type": "network",
      "timestamp": 1780156446290,
      "method": "OPTIONS",
      "url": "http://localhost:8000/api/stories",
      "status": 204,
      "statusText": "No Content",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "*/*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Access-Control-Request-Headers",
          "value": "authorization,traceparent,x-session-id,x-user-id,x-user-role"
        },
        {
          "name": "Access-Control-Request-Method",
          "value": "GET"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        }
      ],
      "requestBody": null,
      "responseBody": "",
      "duration": 3,
      "tagName": "network",
      "selector": "",
      "text": "OPTIONS http://localhost:8000/api/stories"
    },
    {
      "type": "network",
      "timestamp": 1780156446290,
      "method": "OPTIONS",
      "url": "http://localhost:8000/api/stories",
      "status": 204,
      "statusText": "No Content",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "*/*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Access-Control-Request-Headers",
          "value": "authorization,traceparent,x-session-id,x-user-id,x-user-role"
        },
        {
          "name": "Access-Control-Request-Method",
          "value": "GET"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        }
      ],
      "requestBody": null,
      "responseBody": "",
      "duration": 4,
      "tagName": "network",
      "selector": "",
      "text": "OPTIONS http://localhost:8000/api/stories"
    },
    {
      "type": "network",
      "timestamp": 1780156446373,
      "method": "GET",
      "url": "http://localhost:8000/api/stories",
      "status": 304,
      "statusText": "Not Modified",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "application/json, text/plain, */*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Authorization",
          "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AaW5zdGF2ZXJzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODAxNTY0NDYsImV4cCI6MTc4MDc2MTI0Nn0.5aCCde6QrMqbSZNVRuLZj8Vi1mLtbG4_NgixwEhK3ao"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "If-None-Match",
          "value": "W/\"874-GVSEsFHfm9owTvgkG4Bh9QEz9BA\""
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        },
        {
          "name": "sec-ch-ua",
          "value": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\""
        },
        {
          "name": "sec-ch-ua-mobile",
          "value": "?0"
        },
        {
          "name": "sec-ch-ua-platform",
          "value": "\"macOS\""
        },
        {
          "name": "traceparent",
          "value": "00-d14a7eab8076d499459a334a87b007a2-fec45e0c896c8ed1-01"
        },
        {
          "name": "x-session-id",
          "value": "e54e2ccb-fd84-400d-869a-649312fddde7"
        },
        {
          "name": "x-user-id",
          "value": "1"
        },
        {
          "name": "x-user-role",
          "value": "admin"
        }
      ],
      "requestBody": null,
      "responseBody": "{\"stories\":[{\"id\":4,\"caption\":\"Dive into the vibrant world of nature with this stunningly colorful elephant! 🌈🐘 Let this beautiful creature remind us of the diverse and vibrant ecosystems we must protect. 🌿✨\\n\\nShare your favorite animal emoji in the comments! 🐾\",\"category\":\"animals\",\"device\":\"phone\",\"username\":\"admin\",\"user_id\":1,\"image\":\"http://localhost:5005/uploads/bab8bdfb-4115-44bf-88e7-cbd809cc7f88.png\",\"post_date\":\"2025-12-22T20:19:44.207Z\",\"social\":[\"instagram\"],\"tags\":[\"#ColorfulElephant\",\"#EcoFriendly\",\"#ElephantLove\",\"#JungleVibes\",\"#NatureLovers\",\"#ProtectWildlife\",\"#VibrantNature\",\"#WildlifePhotography\"],\"likes\":[1],\"comments\":[]},{\"id\":3,\"caption\":\"City lights at night 🌃\",\"category\":\"Urban\",\"device\":\"iPhone 14\",\"username\":\"john_doe\",\"user_id\":2,\"image\":\"https://picsum.photos/400/400?random=3\",\"post_date\":\"2025-12-22T03:39:31.660Z\",\"social\":null,\"tags\":[\"city\",\"night\",\"photography\"],\"likes\":[3,1],\"comments\":[{\"commentId\":\"a196b041-5df1-4c7c-8278-9ad048da1386\",\"text\":\"test\",\"username\":\"admin\",\"userId\":1,\"commentDate\":\"2026-05-30T01:57:40.644Z\",\"seenByStoryOwner\":false},{\"commentId\":\"comment-3\",\"text\":\"Great shot!\",\"username\":\"jane_smith\",\"userId\":3,\"commentDate\":\"2025-12-22T03:39:31.662Z\",\"seenByStoryOwner\":false}]},{\"id\":2,\"caption\":\"My morning coffee ☕\",\"category\":\"Food\",\"device\":\"Samsung Galaxy\",\"username\":\"jane_smith\",\"user_id\":3,\"image\":\"https://picsum.photos/400/400?random=2\",\"post_date\":\"2025-12-21T03:39:31.660Z\",\"social\":null,\"tags\":[\"coffee\",\"morning\"],\"likes\":[2],\"comments\":[{\"commentId\":\"comment-2\",\"text\":\"Looks delicious!\",\"username\":\"john_doe\",\"userId\":2,\"commentDate\":\"2025-12-21T15:39:31.662Z\",\"seenByStoryOwner\":false}]},{\"id\":1,\"caption\":\"Beautiful sunset at the beach 🌅\",\"category\":\"Nature\",\"device\":\"iPhone 14\",\"username\":\"john_doe\",\"user_id\":2,\"image\":\"https://picsum.photos/400/400?random=1\",\"post_date\":\"2025-12-20T03:39:31.660Z\",\"social\":null,\"tags\":[\"beach\",\"nature\",\"sunset\"],\"likes\":[3],\"comments\":[{\"commentId\":\"comment-1\",\"text\":\"Amazing view! 😍\",\"username\":\"jane_smith\",\"userId\":3,\"commentDate\":\"2025-12-21T03:39:31.662Z\",\"seenByStoryOwner\":false}]}],\"page\":1,\"limit\":10}",
      "duration": 85,
      "tagName": "network",
      "selector": "",
      "text": "GET http://localhost:8000/api/stories"
    },
    {
      "type": "network",
      "timestamp": 1780156446387,
      "method": "GET",
      "url": "http://localhost:8000/api/stories",
      "status": 304,
      "statusText": "Not Modified",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "application/json, text/plain, */*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Authorization",
          "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AaW5zdGF2ZXJzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODAxNTY0NDYsImV4cCI6MTc4MDc2MTI0Nn0.5aCCde6QrMqbSZNVRuLZj8Vi1mLtbG4_NgixwEhK3ao"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "If-None-Match",
          "value": "W/\"874-GVSEsFHfm9owTvgkG4Bh9QEz9BA\""
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        },
        {
          "name": "sec-ch-ua",
          "value": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\""
        },
        {
          "name": "sec-ch-ua-mobile",
          "value": "?0"
        },
        {
          "name": "sec-ch-ua-platform",
          "value": "\"macOS\""
        },
        {
          "name": "traceparent",
          "value": "00-060e2e2e922fd55edebf941028d5673c-6d86c81cddb7ba5a-01"
        },
        {
          "name": "x-session-id",
          "value": "e54e2ccb-fd84-400d-869a-649312fddde7"
        },
        {
          "name": "x-user-id",
          "value": "1"
        },
        {
          "name": "x-user-role",
          "value": "admin"
        }
      ],
      "requestBody": null,
      "responseBody": "{\"stories\":[{\"id\":4,\"caption\":\"Dive into the vibrant world of nature with this stunningly colorful elephant! 🌈🐘 Let this beautiful creature remind us of the diverse and vibrant ecosystems we must protect. 🌿✨\\n\\nShare your favorite animal emoji in the comments! 🐾\",\"category\":\"animals\",\"device\":\"phone\",\"username\":\"admin\",\"user_id\":1,\"image\":\"http://localhost:5005/uploads/bab8bdfb-4115-44bf-88e7-cbd809cc7f88.png\",\"post_date\":\"2025-12-22T20:19:44.207Z\",\"social\":[\"instagram\"],\"tags\":[\"#ColorfulElephant\",\"#EcoFriendly\",\"#ElephantLove\",\"#JungleVibes\",\"#NatureLovers\",\"#ProtectWildlife\",\"#VibrantNature\",\"#WildlifePhotography\"],\"likes\":[1],\"comments\":[]},{\"id\":3,\"caption\":\"City lights at night 🌃\",\"category\":\"Urban\",\"device\":\"iPhone 14\",\"username\":\"john_doe\",\"user_id\":2,\"image\":\"https://picsum.photos/400/400?random=3\",\"post_date\":\"2025-12-22T03:39:31.660Z\",\"social\":null,\"tags\":[\"city\",\"night\",\"photography\"],\"likes\":[3,1],\"comments\":[{\"commentId\":\"a196b041-5df1-4c7c-8278-9ad048da1386\",\"text\":\"test\",\"username\":\"admin\",\"userId\":1,\"commentDate\":\"2026-05-30T01:57:40.644Z\",\"seenByStoryOwner\":false},{\"commentId\":\"comment-3\",\"text\":\"Great shot!\",\"username\":\"jane_smith\",\"userId\":3,\"commentDate\":\"2025-12-22T03:39:31.662Z\",\"seenByStoryOwner\":false}]},{\"id\":2,\"caption\":\"My morning coffee ☕\",\"category\":\"Food\",\"device\":\"Samsung Galaxy\",\"username\":\"jane_smith\",\"user_id\":3,\"image\":\"https://picsum.photos/400/400?random=2\",\"post_date\":\"2025-12-21T03:39:31.660Z\",\"social\":null,\"tags\":[\"coffee\",\"morning\"],\"likes\":[2],\"comments\":[{\"commentId\":\"comment-2\",\"text\":\"Looks delicious!\",\"username\":\"john_doe\",\"userId\":2,\"commentDate\":\"2025-12-21T15:39:31.662Z\",\"seenByStoryOwner\":false}]},{\"id\":1,\"caption\":\"Beautiful sunset at the beach 🌅\",\"category\":\"Nature\",\"device\":\"iPhone 14\",\"username\":\"john_doe\",\"user_id\":2,\"image\":\"https://picsum.photos/400/400?random=1\",\"post_date\":\"2025-12-20T03:39:31.660Z\",\"social\":null,\"tags\":[\"beach\",\"nature\",\"sunset\"],\"likes\":[3],\"comments\":[{\"commentId\":\"comment-1\",\"text\":\"Amazing view! 😍\",\"username\":\"jane_smith\",\"userId\":3,\"commentDate\":\"2025-12-21T03:39:31.662Z\",\"seenByStoryOwner\":false}]}],\"page\":1,\"limit\":10}",
      "duration": 95,
      "tagName": "network",
      "selector": "",
      "text": "GET http://localhost:8000/api/stories"
    },
    {
      "type": "network",
      "timestamp": 1780156465962,
      "method": "OPTIONS",
      "url": "http://localhost:8000/api/auth/profile/1",
      "status": 204,
      "statusText": "No Content",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "*/*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Access-Control-Request-Headers",
          "value": "authorization,traceparent,x-session-id,x-user-id,x-user-role"
        },
        {
          "name": "Access-Control-Request-Method",
          "value": "GET"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        }
      ],
      "requestBody": null,
      "responseBody": "",
      "duration": 9,
      "tagName": "network",
      "selector": "",
      "text": "OPTIONS http://localhost:8000/api/auth/profile/1"
    },
    {
      "type": "network",
      "timestamp": 1780156465975,
      "method": "OPTIONS",
      "url": "http://localhost:8000/api/stories/user/1",
      "status": 204,
      "statusText": "No Content",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "*/*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Access-Control-Request-Headers",
          "value": "authorization,traceparent,x-session-id,x-user-id,x-user-role"
        },
        {
          "name": "Access-Control-Request-Method",
          "value": "GET"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        }
      ],
      "requestBody": null,
      "responseBody": "",
      "duration": 1,
      "tagName": "network",
      "selector": "",
      "text": "OPTIONS http://localhost:8000/api/stories/user/1"
    },
    {
      "type": "network",
      "timestamp": 1780156465975,
      "method": "GET",
      "url": "http://localhost:8000/api/auth/profile/1",
      "status": 304,
      "statusText": "Not Modified",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "application/json, text/plain, */*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Authorization",
          "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AaW5zdGF2ZXJzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODAxNTY0NDYsImV4cCI6MTc4MDc2MTI0Nn0.5aCCde6QrMqbSZNVRuLZj8Vi1mLtbG4_NgixwEhK3ao"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "If-None-Match",
          "value": "W/\"d7-dmMHjj3LVn7XZg/jnGDQzCo0aU8\""
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        },
        {
          "name": "sec-ch-ua",
          "value": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\""
        },
        {
          "name": "sec-ch-ua-mobile",
          "value": "?0"
        },
        {
          "name": "sec-ch-ua-platform",
          "value": "\"macOS\""
        },
        {
          "name": "traceparent",
          "value": "00-f94a49e6012148eef6cf45d94da5a2f6-6745487718352f27-01"
        },
        {
          "name": "x-session-id",
          "value": "e54e2ccb-fd84-400d-869a-649312fddde7"
        },
        {
          "name": "x-user-id",
          "value": "1"
        },
        {
          "name": "x-user-role",
          "value": "admin"
        }
      ],
      "requestBody": null,
      "responseBody": "{\"user\":{\"_id\":1,\"username\":\"admin\",\"email\":\"admin@instaverse.com\",\"role\":\"admin\",\"age\":null,\"gender\":null,\"bio\":\"System Administrator\",\"favorite_style\":null,\"total_posts\":1,\"created_at\":\"2025-12-22T03:39:31.654Z\"}}",
      "duration": 20,
      "tagName": "network",
      "selector": "",
      "text": "GET http://localhost:8000/api/auth/profile/1"
    },
    {
      "type": "network",
      "timestamp": 1780156465987,
      "method": "GET",
      "url": "http://localhost:8000/api/stories/user/1",
      "status": 304,
      "statusText": "Not Modified",
      "requestHeaders": [
        {
          "name": "Accept",
          "value": "application/json, text/plain, */*"
        },
        {
          "name": "Accept-Encoding",
          "value": "gzip, deflate, br, zstd"
        },
        {
          "name": "Accept-Language",
          "value": "en-US,en;q=0.9"
        },
        {
          "name": "Authorization",
          "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AaW5zdGF2ZXJzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODAxNTY0NDYsImV4cCI6MTc4MDc2MTI0Nn0.5aCCde6QrMqbSZNVRuLZj8Vi1mLtbG4_NgixwEhK3ao"
        },
        {
          "name": "Connection",
          "value": "keep-alive"
        },
        {
          "name": "Host",
          "value": "localhost:8000"
        },
        {
          "name": "If-None-Match",
          "value": "W/\"29c-WrZ6MyT7iFZ5jyWL3cEAF9UA2Zc\""
        },
        {
          "name": "Origin",
          "value": "http://localhost:3000"
        },
        {
          "name": "Referer",
          "value": "http://localhost:3000/"
        },
        {
          "name": "Sec-Fetch-Dest",
          "value": "empty"
        },
        {
          "name": "Sec-Fetch-Mode",
          "value": "cors"
        },
        {
          "name": "Sec-Fetch-Site",
          "value": "same-site"
        },
        {
          "name": "User-Agent",
          "value": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
        },
        {
          "name": "sec-ch-ua",
          "value": "\"Chromium\";v=\"148\", \"Google Chrome\";v=\"148\", \"Not/A)Brand\";v=\"99\""
        },
        {
          "name": "sec-ch-ua-mobile",
          "value": "?0"
        },
        {
          "name": "sec-ch-ua-platform",
          "value": "\"macOS\""
        },
        {
          "name": "traceparent",
          "value": "00-92295e7f5c38495a855b912fbc0c0ef3-52e269d8e14f881c-01"
        },
        {
          "name": "x-session-id",
          "value": "e54e2ccb-fd84-400d-869a-649312fddde7"
        },
        {
          "name": "x-user-id",
          "value": "1"
        },
        {
          "name": "x-user-role",
          "value": "admin"
        }
      ],
      "requestBody": null,
      "responseBody": "{\"stories\":[{\"id\":4,\"caption\":\"Dive into the vibrant world of nature with this stunningly colorful elephant! 🌈🐘 Let this beautiful creature remind us of the diverse and vibrant ecosystems we must protect. 🌿✨\\n\\nShare your favorite animal emoji in the comments! 🐾\",\"category\":\"animals\",\"device\":\"phone\",\"username\":\"admin\",\"user_id\":1,\"image\":\"http://localhost:5005/uploads/bab8bdfb-4115-44bf-88e7-cbd809cc7f88.png\",\"post_date\":\"2025-12-22T20:19:44.207Z\",\"social\":[\"instagram\"],\"tags\":[\"#ColorfulElephant\",\"#EcoFriendly\",\"#ElephantLove\",\"#JungleVibes\",\"#NatureLovers\",\"#ProtectWildlife\",\"#VibrantNature\",\"#WildlifePhotography\"],\"likes\":[1],\"comments\":[]}]}",
      "duration": 10,
      "tagName": "network",
      "selector": "",
      "text": "GET http://localhost:8000/api/stories/user/1"
    }
  ],
  "totalSteps": 6,
  "totalNetworkRequests": 10
}

This is actually a pretty interesting idea because you have something richer than traditional analytics:

User interactions (clicks, inputs, navigation)
Network requests
Timing
UI element metadata
Session context

You could build something that sits between:

User Journey Mapping + Process Mining + Test Automation Recorder

Step 1: Convert Raw Events Into Semantic Actions

Your raw recording:

{
  "type": "click",
  "text": "Log In"
}

should become:

{
  "action": "Login",
  "category": "Authentication",
  "confidence": 0.98
}

Likewise:

{
  "type": "input",
  "selector": "#authform_email"
}

becomes:

{
  "action": "Enter Email"
}
Example AI Transformation

Raw:

Page Load /authform
Input email
Input password
Click Log In
POST /api/auth/login 200
GET /api/stories
Click Profile Menu
Click Profile
GET /api/auth/profile/1

Becomes:

1. Open Login Page
2. Enter Credentials
3. Submit Login Form
4. Authentication Successful
5. Load Home Feed
6. Open User Menu
7. Navigate to Profile
8. Load Profile Data

This is already a user journey.

Step 2: Create Journey Nodes

Represent journey as a graph.

[Login Page]
      |
      V
[Authentication]
      |
      V
[Home Feed]
      |
      V
[User Menu]
      |
      V
[Profile Page]

Store as:

{
  "nodes": [
    {
      "id": "login",
      "label": "Login Page"
    },
    {
      "id": "feed",
      "label": "Home Feed"
    },
    {
      "id": "profile",
      "label": "Profile Page"
    }
  ]
}

Then render using:

React Flow
Mermaid
D3.js
Cytoscape

React Flow would be my choice.

Step 3: Infer Screens Automatically

You don't always have page loads in SPAs.

Instead detect screens from:

URL Changes
/authform
/feed
/profile
Network Patterns
POST /auth/login

means

Authentication
GET /stories

means

Feed Page
GET /profile/1

means

Profile Page

You can build a simple rule engine.

[
  {
    pattern: "/api/auth/login",
    screen: "Authentication"
  },
  {
    pattern: "/api/stories",
    screen: "Feed"
  }
]
Step 4: Generate Human-Friendly Journey

AI can generate:

User Goal
User wants to view their profile.
Steps
1. Opens login page
2. Enters credentials
3. Authenticates successfully
4. Loads story feed
5. Opens profile menu
6. Navigates to profile
7. Profile data retrieved
Backend Systems
Authentication Service
Stories Service
Profile Service
APIs Used
POST /api/auth/login
GET /api/stories
GET /api/auth/profile/1
Total Duration
22.3 seconds
Step 5: Journey Map UI

I would build a 4-panel layout:

+------------------------------------+
| Journey Diagram                    |
|                                    |
| Login -> Feed -> Profile           |
+------------------------------------+

+-------------+----------------------+
| Timeline    | Details              |
|             |                      |
| 15:56:04    | Click Login          |
| 15:56:06    | POST auth/login      |
| 15:56:07    | Feed Loaded          |
+-------------+----------------------+
Step 6: AI Insights

This is where it gets really interesting.

Given a journey:

Login
Feed
Profile

AI could generate:

Bottlenecks
User waited 18 seconds between login and next interaction.
Redundant Requests
GET /stories executed twice.

(Your recording actually shows duplicate story requests.)

Test Cases
Scenario: User views profile

Given user is on login page
When user logs in
And navigates to profile
Then profile information is displayed
Playwright Code
await page.fill('#authform_email', email);
await page.fill('#authform_password', password);
await page.click('text=Log In');
await page.click('[data-testid=user-menu]');
await page.click('text=Profile');
Step 7: Multiple Sessions = Process Mining

This is where the product becomes powerful.

Imagine collecting 10,000 sessions.

You discover:

Login
 ├── Feed (70%)
 │     ├── Profile (30%)
 │     ├── Story View (50%)
 │
 └── Search (30%)

Now you have a real process map like enterprise process-mining tools such as Celonis.

Architecture I'd Build
Chrome Extension
       |
       V
Recorder API
       |
       V
Normalizer
       |
       V
Journey Engine
       |
       +--> AI Summarizer
       |
       +--> Diagram Generator
       |
       +--> Test Case Generator
       |
       +--> Playwright Generator

A differentiator could be:

"Record a session once, automatically generate user journey maps, process documentation, test cases, Playwright tests, and architecture diagrams."

That is much more compelling than just another session recorder.

Now we're talking about something much more interesting.

What you're describing isn't a timeline. It's an automatically generated journey graph that looks similar to:

○ Login
   |
   |
○ Feed
   |
   +------ ○ Story Details
   |
   +------ ○ Search
   |
   +------ ○ Profile

Or even a true subway-style map:

🔵 Authentication Line

[Login Page]
      |
      |
[Authenticated]

🟢 Content Line

[Feed] ----- [Story]
   |
   |
[Search]

🟣 User Line

[Profile]
   |
[Edit Profile]
First Problem: What Is a Station?

A station should NOT be every click.

Bad:

Input Email
Input Password
Click Login

Good:

Login

You need a reduction layer.

Your example:

Input Email
Input Password
Click Login
POST /auth/login

becomes:

{
  "node": "Login"
}
Build Nodes from Evidence
Authentication Node

Detected when:

POST /auth/login

appears.

Create:

{
  "id": "login",
  "label": "Login"
}
Feed Node

Detected when:

GET /stories

appears.

Create:

{
  "id": "feed",
  "label": "Feed"
}
Profile Node

Detected when:

GET /auth/profile

appears.

Create:

{
  "id": "profile",
  "label": "Profile"
}

Your session becomes:

Login → Feed → Profile
Store As Graph

Instead of:

steps:[]

store:

{
  "nodes": [
    {
      "id": "login",
      "label": "Login"
    },
    {
      "id": "feed",
      "label": "Feed"
    },
    {
      "id": "profile",
      "label": "Profile"
    }
  ],
  "edges": [
    {
      "source": "login",
      "target": "feed"
    },
    {
      "source": "feed",
      "target": "profile"
    }
  ]
}

Now any graph library can render it.

Make It Look Like a Subway Map

This is the fun part.

Instead of random graph layout:

○
 \
  \
   ○
  /
 /
○

Use:

ELK.js

Best option.

It automatically creates:

○────○────○────○

style diagrams.

React Flow + ELK
React Flow
       +
ELK Layout

You provide:

nodes
edges

and it arranges them.

Add Lines

Subway maps become powerful when nodes belong to domains.

Example:

Authentication Line
Login
Logout
Register
Forgot Password

Blue.

Content Line
Feed
Story
Comment
Like

Green.

User Line
Profile
Settings
Preferences

Purple.

Then your graph becomes:

🔵 Login
      |
      |
🟢 Feed -------- Story
      |
      |
🟣 Profile
Add Usage Counts

After collecting many sessions:

Feed → Profile

might occur:

342 times

while:

Feed → Search

occurs:

1200 times

Render line thickness:

==========

vs

----

like real transit maps.

Add Screenshots as Stations

This could be your killer feature.

Each node contains:

{
  "label": "Profile",
  "thumbnail": "profile.png"
}

Rendered:

┌───────────┐
│ screenshot│
└───────────┘
     ●
  Profile

Now the map instantly tells the story visually.

Architecture I'd Use
Chrome Extension
      ↓
Event Stream
      ↓
AI Journey Extractor
      ↓
Graph Builder
      ↓
React Flow + ELK
      ↓
Subway Map UI

For your sample session, the generated subway map would likely be just:

● Login
    │
    │
● Feed
    │
    │
● Profile

But after a few dozen recordings it becomes:

                    ● Story
                   /
● Login ── ● Feed ─── ● Search
               \
                \
                 ● Profile
                      \
                       ● Edit Profile

which starts looking like a real transit map of the application.

I like it, but I also want to use something like open telemetry. I'm also thinking that we should able to explore the "satation" like see screenshots, loading time, traffic (people can login 1 time, but spend majority of time on feed page)

I think you're accidentally moving into something much bigger than a journey map.

What you're describing starts to look like:

Datadog Service Map + OpenTelemetry Traces + Product Analytics + Session Replay

but visualized as a subway system.

OpenTelemetry Changes Everything

Today you have:

Click Login
POST /auth/login
GET /stories

With OpenTelemetry you can connect:

User Action
    ↓
Frontend Span
    ↓
API Gateway
    ↓
Auth Service
    ↓
Database

Example:

[Login]
  Trace: 1234

  Browser
      5ms
       ↓

  API Gateway
      8ms
       ↓

  Auth Service
      22ms
       ↓

  PostgreSQL
      51ms

Now your station isn't just a screen.

It's a complete observability node.

Station Concept

Instead of:

● Feed

A station becomes:

┌────────────────────┐
│ Feed               │
│ 72% of users       │
│ Avg stay: 4m 12s   │
│ Avg load: 340ms    │
└────────────────────┘

Clicking it opens:

Feed Station
────────────────────────

Screenshot

Users:
  8,321

Average Stay:
  4m 12s

Bounce Rate:
  3%

APIs:
  GET /stories
  GET /comments
  GET /likes

Slowest API:
  GET /stories (750ms)

Backend Services:
  Story Service
  Comment Service

Common Next Stops:
  Profile (40%)
  Story Details (35%)
  Search (20%)
Subway Map + Analytics

Imagine:

               Story
                 ●
                /
               /
Login ●───● Feed ─────● Search
           │
           │
           ● Profile

Each station has:

Traffic
Feed
8,432 visits
Time Spent
Feed
4m 12s avg
Satisfaction
Feed
🙂 92%
Performance
Feed
340ms avg load
Errors
Feed
1.2% error rate
Use Journey Data Like a Metro System

The thickness of the line represents traffic.

Login ========= Feed

means:

95% of users
Feed -- Search

means:

15% of users

You immediately see dominant paths.

Screenshot Timeline

Clicking a station could show:

Feed
────────────────

Screenshot Gallery

08:01
08:15
08:45
09:30

or

Desktop
Mobile
Tablet

versions.

OpenTelemetry Waterfall

This is where things get really cool.

Click Feed station:

Feed

Load Time
─────────────

Browser
█████ 45ms

API Gateway
██████████ 85ms

Story Service
██████████████ 120ms

Redis
██ 10ms

Postgres
████████████████ 160ms

Exactly like Jaeger or Datadog.

Multiple Layers

I would actually create 3 layers.

Layer 1: User Journey
Login → Feed → Profile

For PMs.

Layer 2: Product Analytics
Traffic
Drop-offs
Time spent

For product teams.

Layer 3: Technical Journey
Browser
Gateway
Auth Service
Stories Service
Database

For engineers.

Switching views:

[ Journey ]
[ Analytics ]
[ Architecture ]

Same subway map.

Different overlays.

What Makes This Unique

Most tools separate these things:

Tool	What it Shows
Session replay	User actions
Datadog	Backend
Jaeger	Traces
Mixpanel	Funnels
Playwright	Tests

You already have the recorder.

If you add:

OpenTelemetry
+
Screenshots
+
Journey Graph
+
Analytics

then a station becomes:

Feed

and from that one node I can see:

Screenshot
User actions
Time spent
Traffic volume
APIs called
Trace waterfall
Backend services
Error rates
Generated Playwright tests

That's the kind of experience that would feel genuinely different from existing observability or analytics products.

why is this idea better then datadog or anything else available, be honest is it worth of time to build

Short answer:

No, it's not automatically better than Datadog.
Yes, it might be worth building—but probably not as a standalone observability platform.

The biggest risk I see is that you're looking at the idea through an engineer's lens, while the buyers are often PMs, QA leaders, engineering managers, and developers trying to understand user behavior.

What Datadog Already Does Better

Datadog already has:

OpenTelemetry support
Service maps
Distributed tracing
RUM (Real User Monitoring)
Session replay
Dashboards
Error tracking
Performance analytics

Competing head-on with Datadog is probably a losing battle.

A team spending $100k+ on Datadog isn't going to switch because your subway map looks nicer.

Where Datadog Is Weak

Ask yourself:

"Can Datadog automatically generate a human-understandable user journey from an actual interaction?"

Not really.

Datadog tells me:

POST /login
200ms

GET /stories
300ms

GET /profile
150ms

Engineers love that.

PMs don't.

QA doesn't.

Documentation writers don't.

New hires don't.

The Real Product Might Be

Not:

Datadog competitor

but:

Application Understanding Platform

You already have something interesting:

User action
+
DOM
+
Selectors
+
Network
+
Screenshots

Most observability tools don't have all of that in one place.

The Thing I Would Pay For

Imagine onboarding to a new company.

Instead of:

200 Confluence pages

I install your extension and record a session.

It generates:

Application Map

Authentication
   ↓
Feed
   ↓
Profile

APIs:
  /login
  /stories
  /profile

Services:
  auth-service
  story-service

Common Paths:
  Feed → Story
  Feed → Search

Generated Test Cases:
  48

Generated Playwright Tests:
  48

That has value.

Where Your Background Gives You an Advantage

You are not a PM.

You are not an observability engineer.

You are a Test Automation Architect.

That changes everything.

Your unfair advantage is:

Journey
+
Observability
+
Testing

For example:

Record:

Login
Feed
Profile

Generate:

User Journey

Generate:

Playwright Test

Generate:

Gherkin

Generate:

API Contract

Generate:

Test Coverage Report

Generate:

Risk Assessment

Now you're solving a QA problem.

What I Think the Market Wants

I don't think people are looking for:

Another observability tool

I think people are looking for:

How do I understand this application?

Every team has:

outdated docs
outdated test cases
outdated architecture diagrams
tribal knowledge

Your recorder is already collecting enough information to help solve that.

What I Would Build First

Not OpenTelemetry.

Not distributed tracing.

Not analytics.

Not a SaaS.

I'd build:

V1

Record session →

Generate:

User Journey Map
Mermaid Diagram
Playwright Test
Gherkin Scenario
Markdown Documentation

That's a weekend project.

You can show it on LinkedIn and YouTube.

V2

Add screenshots.

Now every node becomes visual.

V3

Aggregate sessions.

Now you get:

Login
  ↓
Feed (92%)
  ↓
Profile (41%)
V4

Add OpenTelemetry.

Now you can click a station and see traces.