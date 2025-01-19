from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from pynput import keyboard
import pandas as pd
import time
import datetime

class InstagramAnalyzer:
    def __init__(self):
        self.driver = None
        self.is_analyzing = False
        self.data = []
        self.current_account = None
        
    def setup_driver(self):
        """브라우저 드라이버 설정"""
        options = webdriver.ChromeOptions()
        options.binary_location = "brave의 실제 경로를 입력해주세요"  # 브레이브 브라우저 경로
        self.driver = webdriver.Chrome(options=options)
        
    def start(self):
        """분석기 시작"""
        self.setup_driver()
        self.setup_keyboard_listener()
        
    def setup_keyboard_listener(self):
        """키보드 리스너 설정"""
        def on_press(key):
            try:
                if key.char == 'q':
                    self.start_analysis()
                elif key.char == 'w':
                    self.collect_data()
                elif key.char == 'e':
                    self.stop_analysis()
            except AttributeError:
                pass
            
        listener = keyboard.Listener(on_press=on_press)
        listener.start()
        
    def start_analysis(self):
        """현재 페이지의 계정 분석 시작"""
        self.is_analyzing = True
        self.current_account = self.get_current_account_info()
        print(f"분석 시작: {self.current_account['username']}")
        
    def get_current_account_info(self):
        """현재 계정 정보 수집"""
        try:
            username = self.driver.find_element(By.CSS_SELECTOR, "._aa_c").text
            stats = self.driver.find_elements(By.CSS_SELECTOR, "._ac2a")
            posts = stats[0].text
            followers = stats[1].text
            following = stats[2].text
            bio = self.driver.find_element(By.CSS_SELECTOR, "._aa_c").text
            
            # 릴스 평균 조회수 계산
            reels_views = self.get_average_reels_views()
            
            return {
                'username': username,
                'posts': posts,
                'followers': followers,
                'following': following,
                'bio': bio,
                'avg_reels_views': reels_views,
                'collected_at': datetime.datetime.now()
            }
        except Exception as e:
            print(f"정보 수집 중 오류 발생: {e}")
            return None
            
    def get_average_reels_views(self):
        """최근 9개 릴스의 평균 조회수 계산"""
        try:
            reels_tab = self.driver.find_element(By.XPATH, "//a[contains(@href, '/reels/')]")
            reels_tab.click()
            time.sleep(2)
            
            views_elements = self.driver.find_elements(By.CSS_SELECTOR, ".view-count")[:9]
            views = [int(''.join(filter(str.isdigit, el.text))) for el in views_elements]
            
            return sum(views) / len(views) if views else 0
        except Exception:
            return 0
            
    def collect_data(self):
        """현재 계정 데이터 수집"""
        if self.current_account and self.is_analyzing:
            self.data.append(self.current_account)
            print(f"데이터 수집 완료: {self.current_account['username']}")
            self.save_data()
            
    def stop_analysis(self):
        """현재 계정 분석 중단"""
        self.is_analyzing = False
        self.current_account = None
        print("분석 중단")
        
    def save_data(self):
        """수집된 데이터 저장"""
        df = pd.DataFrame(self.data)
        df.to_excel('instagram_accounts.xlsx', index=False)
        print("데이터 저장 완료")
        
    def close(self):
        """브라우저 종료"""
        if self.driver:
            self.driver.quit()

if __name__ == "__main__":
    analyzer = InstagramAnalyzer()
    analyzer.start()
    
    print("Instagram Account Analyzer 시작됨")
    print("사용 방법:")
    print("Q: 현재 계정 분석 시작")
    print("W: 조건 충족시 데이터 수집")
    print("E: 분석 중단/다음으로 넘어가기")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        analyzer.close()