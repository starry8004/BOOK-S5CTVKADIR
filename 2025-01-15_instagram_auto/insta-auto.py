from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def check_account_criteria(driver, account_url):
    # 계정 페이지로 이동
    driver.get(account_url)
    
    # 기준 확인 로직 구현
    has_link = check_bio_link(driver)
    followers_count = get_followers_count(driver)
    replies_to_comments = check_replies_to_comments(driver)
    avg_reels_views = get_average_reels_views(driver)
    
    return has_link and followers_count >= 10000 and replies_to_comments and avg_reels_views >= 10000

def collect_account_info(driver):
    # 계정 정보 수집 로직 구현
    username = driver.find_element(By.XPATH, "//h2[@class='_aacl _aacs _aact _aacx _aada']").text
    posts_count = driver.find_element(By.XPATH, "//span[@class='_ac2a']").text
    followers_count = driver.find_elements(By.XPATH, "//span[@class='_ac2a']")[1].text
    following_count = driver.find_elements(By.XPATH, "//span[@class='_ac2a']")[2].text
    bio_link = driver.find_element(By.XPATH, "//a[@class='_ap3a _aaco _aacw _aacx _aad7 _aade']").get_attribute('href')
    
    return {
        "username": username,
        "posts_count": posts_count,
        "followers_count": followers_count,
        "following_count": following_count,
        "bio_link": bio_link
    }

# 메인 크롤링 로직
driver = webdriver.Chrome()
accounts_to_check = ["account1_url", "account2_url", ...]  # 확인할 계정 URL 리스트

for account_url in accounts_to_check:
    if check_account_criteria(driver, account_url):
        account_info = collect_account_info(driver)
        print(account_info)

driver.quit()
