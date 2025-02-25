import requests
from bs4 import BeautifulSoup
import openpyxl
from datetime import datetime
import time

# 현재 날짜 및 시간
current_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

# 엑셀 파일 이름 설정
file_name = f"11stbest500_{current_time}.xlsx"

# 엑셀 파일 생성
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Best Sellers"
ws.append(['순서', '링크', '상품명', '할인율', '정상가', '판매가', '배송비', '판매처'])

# 페이지 순회 및 데이터 수집
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

base_url = "https://www.11st.co.kr"
url = f"{base_url}/browsing/BestSeller.tmall?method=getBestSellerMain&cornerNo=5"

index = 1  # 순서 초기화

for page in range(1, 11):  # 페이지 수를 조정하세요
    response = requests.get(f"{url}&page={page}", headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # 상품 목록 추출
    products = soup.select('li[id^="thisClick_"]')

    for product in products:
        try:
            # 상품명 추출
            product_name = product.select_one('.pname p').text.strip()
            # 링크 추출
            product_link = product.select_one('a')['href']
            # 할인율 추출
            discount = product.select_one('.sale').text.strip() if product.select_one('.sale') else "N/A"
            # 정상가 추출
            normal_price = product.select_one('.normal_price').text.strip() if product.select_one('.normal_price') else "N/A"
            # 판매가 추출
            sale_price = product.select_one('.sale_price').text.strip() if product.select_one('.sale_price') else "N/A"
            # 배송비 추출
            delivery = product.select_one('.s_flag em').text.strip() if product.select_one('.s_flag em') else "N/A"
            # 판매처 추출
            seller = product.select_one('.store a').text.strip() if product.select_one('.store a') else "N/A"
            
            # 엑셀에 데이터 추가
            ws.append([index, product_link, product_name, discount, normal_price, sale_price, delivery, seller])
            print(f"순서: {index}, 상품명: {product_name}, 판매가: {sale_price}")
            index += 1
            
        except Exception as e:
            print(f"Error: {e}")

    time.sleep(1)  # 요청 간의 대기 시간 설정

# 엑셀 파일 저장
wb.save(file_name)
print(f"{file_name} 파일로 저장되었습니다.")
