import urllib.request
import json

def test_demo_flow():
    # 1. Test Demo Load
    req = urllib.request.Request('http://127.0.0.1:8000/api/demo/load', data=b'{}', headers={'Content-Type': 'application/json', 'X-User-Id': 'USR-TEST-123'})
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    print('Demo Load Status:', res.status)
    print('Demo Load Success:', data.get('success'))
    print('Demo Load Patients:', [p.get('name') for p in data.get('patients', [])])

    # 2. Test Get Patients
    req_get = urllib.request.Request('http://127.0.0.1:8000/api/patients', headers={'X-User-Id': 'USR-TEST-123'})
    res_get = urllib.request.urlopen(req_get)
    data_get = json.loads(res_get.read().decode())
    patients_list = data_get if isinstance(data_get, list) else data_get.get('patients', [])
    print('GET /patients Count:', len(patients_list))
    for p in patients_list:
        print(f" - {p['name']} ({p['patientId']}): docCount={p.get('documentCount')}")

    # 3. Test Manual Patient Creation
    create_body = json.dumps({
        "name": "Arun Ghosh",
        "relationship": "Brother",
        "gender": "Male"
    }).encode()
    req_create = urllib.request.Request('http://127.0.0.1:8000/api/patients', data=create_body, headers={'Content-Type': 'application/json', 'X-User-Id': 'USR-TEST-123'})
    res_create = urllib.request.urlopen(req_create)
    data_create = json.loads(res_create.read().decode())
    print('Created Patient Status:', res_create.status)
    created_pat = data_create.get('patient') if isinstance(data_create, dict) and 'patient' in data_create else data_create
    print('Created Patient:', created_pat.get('name'))

    # 4. Re-fetch
    req_get2 = urllib.request.Request('http://127.0.0.1:8000/api/patients', headers={'X-User-Id': 'USR-TEST-123'})
    res_get2 = urllib.request.urlopen(req_get2)
    data_get2 = json.loads(res_get2.read().decode())
    patients_list2 = data_get2 if isinstance(data_get2, list) else data_get2.get('patients', [])
    print('Final Patients Count:', len(patients_list2))
    for p in patients_list2:
        print(f" - {p['name']} ({p['patientId']}): docCount={p.get('documentCount')}")

if __name__ == '__main__':
    test_demo_flow()
