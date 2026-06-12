# 정적 사이트를 nginx 컨테이너로 서빙 (Cloud Run용)
FROM nginx:1.27-alpine

# nginx 설정 교체
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 정적 파일 복사 (.dockerignore 로 불필요 파일 제외)
COPY . /usr/share/nginx/html

# Cloud Run 은 PORT 환경변수(기본 8080)로 들어옴 → nginx 가 8080 으로 listen
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
