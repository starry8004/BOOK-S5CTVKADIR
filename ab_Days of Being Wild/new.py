import requests
from bs4 import BeautifulSoup
import openpyxl
from datetime import datetime
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 현재 날짜 및 시간
current_time = datetime.now().strftime("%Y%m%d_%H%M%S")

# 엑셀 파일 이름 설정
file_name = f"11stbest500_{current_time}.xlsx"

# 엑셀 파일 생성
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Best Sellers"
ws.append(['순서', '링크', '상품명', '할인율', '정상가', '판매가', '배송비', '판매처', '대표이미지URL', '상세페이지이미지URL'])

# Selenium 웹드라이버 설정
driver = webdriver.Chrome()  # 크롬드라이버 경로를 지정해야 할 수 있습니다.

# 11번가 베스트 상품 페이지 접속
base_url = "https://www.11st.co.kr/browsing/BestSeller.tmall?method=getBestSellerMain&cornerNo=5"
driver.get(base_url)

# 페이지 끝까지 스크롤
last_height = driver.execute_script("return document.body.scrollHeight")
while True:
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    new_height = driver.execute_script("return document.body.scrollHeight")
    if new_height == last_height:
        break
    last_height = new_height

# 상품 정보 추출
products = driver.find_elements(By.CSS_SELECTOR, 'li[id^="thisClick_"]')

for index, product in enumerate(products, start=1):
    try:
        # 상품명 추출
        product_name = product.find_element(By.CSS_SELECTOR, '.pname p').text.strip()
        
        # 링크 추출
        product_link = product.find_element(By.TAG_NAME, 'a').get_attribute('href')
        
        # 할인율 추출
        discount = product.find_element(By.CSS_SELECTOR, '.sale').text.strip() if product.find_elements(By.CSS_SELECTOR, '.sale') else "N/A"
        
        # 정상가 추출
        normal_price = product.find_element(By.CSS_SELECTOR, '.normal_price').text.strip() if product.find_elements(By.CSS_SELECTOR, '.normal_price') else "N/A"
        
        # 판매가 추출
        sale_price = product.find_element(By.CSS_SELECTOR, '.sale_price').text.strip() if product.find_elements(By.CSS_SELECTOR, '.sale_price') else "N/A"
        
        # 배송비 추출
        delivery = product.find_element(By.CSS_SELECTOR, '.s_flag em').text.strip() if product.find_elements(By.CSS_SELECTOR, '.s_flag em') else "N/A"
        
        # 판매처 추출
        seller = product.find_element(By.CSS_SELECTOR, '.store a').text.strip() if product.find_elements(By.CSS_SELECTOR, '.store a') else "N/A"

        # 대표 이미지 URL 추출
        th_image = product.find_element(By.CSS_SELECTOR, '.img_plot img').get_attribute('src')

        # 상세 페이지로 이동하여 상세 이미지 URL 추출
        driver.execute_script("window.open('');")
        driver.switch_to.window(driver.window_handles[-1])
        driver.get(product_link)
        
        # 상세 페이지 이미지 URL 추출 (예시, 실제 구조에 맞게 수정 필요)
        detail_images = driver.find_elements(By.CSS_SELECTOR, '.product_detail img')
        detail_image_urls = ','.join([img.get_attribute('src') for img in detail_images])

        driver.close()
        driver.switch_to.window(driver.window_handles[0])

        # 엑셀에 데이터 추가
        ws.append([index, product_link, product_name, discount, normal_price, sale_price, delivery, seller, th_image, detail_image_urls])
        print(f"처리 완료: {index}. {product_name}")

    except Exception as e:
        print(f"Error processing product {index}: {e}")

    if index >= 500:  # 500개 상품 추출 후 종료
        break

# 엑셀 파일 저장
wb.save(file_name)
print(f"{file_name} 파일로 저장되었습니다.")

driver.quit()