package com.team4.reservation.qrcode;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.team4.common.error.CustomException;
import com.team4.common.error.ErrorCode;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

// 티켓의 qrToken 문자열을 QR 코드 PNG 이미지로 인코딩. 체크인 시 스캐너가 읽는 값은 이 qrToken 그대로.
public final class QrCodeGenerator {

    private static final int SIZE_PX = 300; // 300x300px — 화면/인쇄 어느 쪽에서 스캔해도 충분한 해상도로 임의 선택

    private QrCodeGenerator() {
    }

    // content를 그대로 QR에 인코딩
    public static String toBase64Png(String content) {
        try {
            // QRCodeWriter.encode 결과는 흑백 픽셀 배열(BitMatrix) — 아직 이미지 파일이 아님
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, SIZE_PX, SIZE_PX);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            // BitMatrix -> 실제 PNG 바이트로 변환.
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            // 바이너리(PNG)를 JSON 응답에 그대로 넣을 수 없어서 base64 텍스트로 변환
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (WriterException | IOException e) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR, "QR 코드 생성에 실패했습니다.");
        }
    }
}
