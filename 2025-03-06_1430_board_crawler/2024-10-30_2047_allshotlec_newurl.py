from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pathlib import Path
import time
import logging
import json
from urllib.parse import urljoin
import re
import requests

class LectureCrawler:
    def __init__(self, base_url: str = "https://secretcrew.kr"):
        self.base_url = base_url
        self.driver = None
        self.logger = self._setup_logger()
        self._setup_driver()
        self.lecture_list = {
            1: "1-0. 비밀문서에서 가장 중요한 부자되기 10계명",  
            3: "1-1. <문제해결>을 못하고 부자가 된 사람은 없다.",  
            4: "1-2. <부자되는 뇌>모드로 세팅하기",  
            18: "1-3. 돈을 움직이는 단 2가지의 공식 <수요와 공급>, <노출과 전환>",  
            19: "1-4. 사업이 절대 망하지 않는 방법 <확률 높이기>",  
            20: "1-5. <돈 버는 운>을 끌어당기는 법",  
            21: "1-6. 사람들이 지갑을 여는 이유 <이득>",  
            22: "1-7. 사람들이 지갑을 여는 단계 <퍼널>",  
            23: "1-8. 나만의 돈버는 틈새를 찾는 법 <경쟁 피하기>",  
            24: "1-9. 자동화를 위해 꼭 필요한 것 <보아뱀 만들기>",  
            25: "1-10. <사업의 내비게이션> 돈을 벌기 시작했다. 그 다음은?",  
            271: "언젠간 거쳐갈 단계 <법인>",  
            39: "2-1. 물꼬트기, 기대치 조절하기, 마케팅 자동화",  
            40: "2-2. 나는 뭘 팔아야 할까? + 도매/공장 목록",  
            276: "오프라인에서 상품 소싱하기",  
            269: "2-3. 어디에 팔아야 할까?",  
            48: "2-4. 마진을 가장 높여주는 가격 정하는 법",  
            31: "3-1. 내 고객이 뭘 원하는지 알아내는 <키워드>",  
            32: "3-2. 물꼬트기의 기본 <블로그>",  
            297: "최신 <블로그 로직>과 상품 판매 활용 방법",  
            299: "AI 검색의 시작, 뜨거운 감자 <스마트블록>",  
            270: "경쟁자를 이길 수 있는 강력한 무기 <네이버 인플루언서>",  
            273: "최적화 블로그? 저품질? 블로그 카더라에 대하여",  
            33: "3-3. 내 잠재고객들이 모여있는 곳 <카페> + 카페목록",  
            34: "3-4. 0원으로 내 상품을 노출시킬 수 있는 <파워링크>",  
            35: "3-5. 초보도 쉽게 상위노출 가능한 <쇼핑검색광고>",  
            268: "3-7. 노출을 극대화 시켜주는 <유튜브>",  
            78: "영상 편집도 할 줄 모르던 남편, 구독자 5천명 만든 법",  
            277: "3-8. 고객을 모으는 저수지 <카카오 오픈채팅>",  
            280: "스토어-1. 노출을 극대화 시켜주는 상품등록법",  
            281: "스토어-2 네이버쇼핑 순위 올리는 원리",  
            282: "스토어-3. 상위노출의 핵심과 최단기간 상위노출 전략",  
            283: "스토어-4. 가격비교 장단점과 매칭원리",  
            284: "스토어-5. 가격비교 해제하기",  
            52: "심화-1. 드디어 밝혀지는 <스마트스토어의 비밀>",  
            275: "심화-2. <스마트스토어 SEO> 어디까지 진짜야?",  
            274: "심화-3. 네이버쇼핑의 꽃 <브랜드 패키지> + 상표권",  
            305: "쿠팡광고-1. 광고로 쿠팡에서 잘 팔릴 상품 찾아내는 법",  
            306: "쿠팡광고-2. 매출최적화 광고 효율 내기",  
            307: "쿠팡광고-3. 수동키워드 광고 효율 내기",  
            291: "채널-1 오픈마켓 판매전략 세우기",  
            292: "채널-2 G마켓, 옥션, 11번가 판매 노하우",  
            290: "채널-3 카카오톡 스토어, 쿠팡 판매 노하우",  
            293: "채널-4 오픈마켓에서 차별화해서 판매하는 법",  
            285: "구매대행-1. 쌩초보에게 중국구매대행이 특히 좋은 이유",  
            286: "구매대행-2. 월 순익 100만원을 가장 빨리 달성하는 법",  
            287: "구매대행-3 구매대행의 한계와 그 한계를 넘는 방법",  
            288: "구매대행-4 지식재산권 벌금 피하는 법과 인증없이 구매대행하기",  
            289: "구매대행-5. 아무도 100% 정확하게 아는 사람이 없다는 구매대행 세금뽀개기",  
            42: "5-1. 초등학생도 따라할 수 있는 <상세페이지> 만들기",  
            43: "5-2. 내 상품의 <셀링포인트>는 뭘까?",  
            44: "5-3. 안 사고는 못 배기게 만드는 <세일즈 기법>",  
            45: "5-4. 한끗 차이로 갈라지는 잘 쓴 글, 못 쓴 글",  
            47: "5-5. 절대 쓰면 안되는 단어들",  
            49: "5-6. 내 상품의 대변인 만들기 <리뷰>",  
            50: "5-7. <악성고객> 어떻게 대응해야 할까?",  
            57: "6-1. 마케팅 자동화 방법 3가지",  
            58: "6-2. 다 좋은데 자동화엔 최악인 구조, 네이버. 이젠 <자사몰>",  
            61: "6-3. 고객 스스로 발을 담그게 하기 <이메일마케팅>",  
            62: "6-4. 고객에게 결정타를 날리는 <컨텐츠 작성법>",  
            63: "6-5. 이거 확인 안하면 말짱 꽝입니다. <통계>",  
            65: "7-1. 작은 회사 알바, 직원 뽑는 실전 노하우",  
            68: "7-2. 새직원 <출근 첫 날> 꼭 해야할 일",  
            69: "7-3. 평범한 직원도 <좋은 직원>으로 만드는 법",  
            67: "7-4. 직원들이 따르는 <좋은 사장> 되기",  
            70: "7-5. <해고>할지 말지 고민되는 직원, 어떻게 해야할까?",  
            71: "7-6. <자동화> 직원이 스스로 일하게 하는 법",  
            66: "7-7. 모르면 범법자가 될 수 있는 <노동법> + 각종서식",  
            27: "8-1. 돈을 벌려면 <인맥>이 중요하다던데?",  
            28: "8-2. 아껴야 부자된다던데? 아껴야 할 것과 말아야 할 것",  
            29: "8-3. <블루오션>을 찾아야 돈이 된다던데?",  
            73: "9-1. 3단계 자판기 만드는 방법 2가지",  
            74: "9-2. 4천만원으로 3억 3천만원 가치의 땅을 살 수 있었던 사례",  
            75: "9-3. 3천만원으로 3억을 벌었던 사례 - 꼭 좋은 아파트에 투자해야 할까?",  
            294: "사업가가 내야 할 세금 3가지와 절세 방법",  
            304: "내 사업의 숨은 조력자, <전문가> 잘 찾아내기"
        }
        
    def _setup_logger(self):
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)
        return logger

    def _setup_driver(self):
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--window-size=1920,1080')
        
        service = Service(Path("chromedriver/chromedriver-win64/chromedriver.exe"))
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.implicitly_wait(10)

    def login(self, username: str = None, password: str = None) -> bool:
        """사이트 로그인"""
        try:
            self.logger.info("로그인 시도...")
            self.driver.get(f"{self.base_url}/bbs/login.php")
            time.sleep(2)
            
            if username is None:
                username = input("아이디를 입력하세요: ")
            if password is None:
                password = input("비밀번호를 입력하세요: ")
            
            self.driver.find_element(By.NAME, "mb_id").send_keys(username)
            self.driver.find_element(By.NAME, "mb_password").send_keys(password)
            self.driver.find_element(By.CLASS_NAME, "btn_submit").click()
            
            time.sleep(3)
            success = "로그아웃" in self.driver.page_source
            
            if success:
                self.logger.info("로그인 성공!")
            else:
                self.logger.error("로그인 실패")
            
            return success
            
        except Exception as e:
            self.logger.error(f"로그인 실패: {str(e)}")
            return False

    def get_lecture_content(self, lecture_id: int) -> bool:
        """개별 강의 내용 수집"""
        try:
            # 새 창에서 강의 페이지 열기
            self.driver.execute_script("window.open('');")
            self.driver.switch_to.window(self.driver.window_handles[-1])
            
            # 강의 페이지 접근
            lecture_url = f"{self.base_url}/bbs/board.php?bo_table=secretpaper&wr_id={lecture_id}"
            self.driver.get(lecture_url)
            time.sleep(2)
            
            # 강의 제목 (미리 정의된 목록에서 가져오기)
            title = self.lecture_list.get(lecture_id, f"강의 {lecture_id}")
            self.logger.info(f"강의: {title}")
            
            # 내용 수집
            try:
                content = self.driver.find_element(By.ID, "bo_v_con").get_attribute('innerHTML')
                self.logger.info("내용 찾음")
            except:
                self.logger.error(f"강의 {lecture_id}의 내용을 찾을 수 없습니다.")
                self.driver.close()
                self.driver.switch_to.window(self.driver.window_handles[0])
                return False
            
            # 이미지 저장 및 HTML 수정
            updated_content, saved_images = self._save_images(content, lecture_id)
            
            # 결과 저장
            lecture_dir = Path("lectures")
            lecture_dir.mkdir(exist_ok=True)
            
            # HTML 파일 저장
            html_path = lecture_dir / f"lecture_{lecture_id}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(f"""
                <html>
                <head>
                    <title>{title}</title>
                    <meta charset="utf-8">
                </head>
                <body>
                <h1>{title}</h1>
                {updated_content}
                </body>
                </html>
                """)
            
            # 메타데이터 저장
            metadata = {
                'id': lecture_id,
                'title': title,
                'url': lecture_url,
                'saved_images': saved_images
            }
            
            json_path = lecture_dir / f"lecture_{lecture_id}_meta.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"강의 {lecture_id} 저장 완료")
            
            # 현재 창 닫고 메인 창으로 돌아가기
            self.driver.close()
            self.driver.switch_to.window(self.driver.window_handles[0])
            
            return True
            
        except Exception as e:
            self.logger.error(f"강의 {lecture_id} 저장 실패: {str(e)}")
            try:
                self.driver.close()
                self.driver.switch_to.window(self.driver.window_handles[0])
            except:
                pass
            return False

    def _save_images(self, html_content: str, lecture_id: int) -> tuple:
        """이미지 저장 및 HTML 내 이미지 경로 수정"""
        img_dir = Path("lectures") / f"lecture_{lecture_id}_images"
        img_dir.mkdir(parents=True, exist_ok=True)
        
        saved_images = []
        updated_html = html_content
        
        # img 태그 찾기
        img_pattern = r'<img[^>]+src="([^">]+)"'
        for img_url in re.findall(img_pattern, html_content):
            try:
                abs_url = urljoin(self.base_url, img_url)
                img_filename = f"image_{len(saved_images) + 1}.png"
                local_path = img_dir / img_filename
                
                # 이미지 다운로드
                response = requests.get(abs_url)
                if response.status_code == 200:
                    with open(local_path, 'wb') as f:
                        f.write(response.content)
                    saved_images.append(str(local_path))
                    
                    # HTML 내 이미지 경로 수정
                    updated_html = updated_html.replace(img_url, f"./lecture_{lecture_id}_images/{img_filename}")
                    
            except Exception as e:
                self.logger.warning(f"이미지 저장 실패 ({img_url}): {str(e)}")
                
        return updated_html, saved_images

    def collect_all_lectures(self):
        """정의된 모든 강의 수집"""
        try:
            lecture_ids = sorted(list(self.lecture_list.keys()))
            total = len(lecture_ids)
            self.logger.info(f"총 {total}개의 강의 수집 시작")
            
            success = 0
            failed = 0
            
            for idx, lecture_id in enumerate(lecture_ids, 1):
                title = self.lecture_list[lecture_id]
                self.logger.info(f"\n[{idx}/{total}] 강의 {lecture_id} 수집 시작: {title}")
                
                try:
                    if self.get_lecture_content(lecture_id):
                        success += 1
                    else:
                        failed += 1
                    
                    # 서버 부하 방지
                    time.sleep(2)
                        
                except Exception as e:
                    self.logger.error(f"강의 {lecture_id} 수집 중 오류: {str(e)}")
                    failed += 1
                    continue
            
            self.logger.info(f"""
            수집 완료:
            - 전체: {total}개
            - 성공: {success}개
            - 실패: {failed}개
            """)
            return True
            
        except Exception as e:
            self.logger.error(f"전체 강의 수집 실패: {str(e)}")
            return False

def main():
    crawler = None
    try:
        crawler = LectureCrawler()
        if crawler.login():
            time.sleep(3)
            print("\n1. 단일 강의 수집")
            print("2. 전체 강의 수집")
            choice = input("\n선택하세요 (1 또는 2): ")
            
            if choice == "1":
                print("\n사용 가능한 강의 목록:")
                for id, title in sorted(crawler.lecture_list.items()):
                    print(f"{id}: {title}")
                    
                lecture_id = int(input("\n수집할 강의 ID를 입력하세요: "))
                if lecture_id in crawler.lecture_list:
                    if crawler.get_lecture_content(lecture_id):
                        print(f"\n강의 {lecture_id} 수집 완료!")
                    else:
                        print(f"\n강의 {lecture_id} 수집 실패!")
                else:
                    print("\n잘못된 강의 ID입니다.")
            else:
                if crawler.collect_all_lectures():
                    print("\n전체 강의 수집 완료!")
                else:
                    print("\n전체 강의 수집 실패!")
                    
    except KeyboardInterrupt:
        print("\n프로그램 종료...")
    except Exception as e:
        print(f"오류 발생: {str(e)}")
    finally:
        if crawler:
            crawler.driver.quit()

if __name__ == "__main__":
    main()