package com.team4.expo.client;

// AI 비전 분석 클라이언트에 넘길 이미지 1장의 원시 데이터 (정면/측면/후면 등 여러 장을 함께 보낼 수 있음).
public record VehicleImageInput(byte[] bytes, String mimeType) {
}
