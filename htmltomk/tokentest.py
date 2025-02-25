import requests

def test_replicate_token(token):
    headers = {
        'Authorization': f'Token {token}'
    }
    
    response = requests.get('https://api.replicate.com/v1/models', headers=headers)
    
    if response.status_code == 200:
        print("토큰이 유효합니다!")
        return True
    else:
        print(f"토큰이 유효하지 않습니다. 상태 코드: {response.status_code}")
        print(f"에러 메시지: {response.text}")
        return False

# 여기에 본인의 토큰을 넣으세요
token = "replacement"
test_replicate_token(token)