# Navimaps iOS distribution page

Trang này được phục vụ tại:

`https://nhutvo2310.github.io/Navimaps/ios/`

## Cách lấy phiên bản

`app.js` chỉ chấp nhận release thỏa cả ba điều kiện:

- Tag đúng dạng `ios-vX.Y.Z`.
- Release không phải draft hoặc prerelease.
- Có asset tên chính xác `Navimaps.ipa`.

Trang thử đọc `nhutvo2310/Navimaps-iOS` trước. Repository này hiện private nên GitHub API công khai trả 404. Trang sau đó đọc release của repository public `nhutvo2310/Navimaps`, nơi workflow iOS có thể mirror riêng IPA mà không công khai mã nguồn.

Không đặt GitHub token, Apple ID hoặc mật khẩu trong JavaScript của website.

## Kích hoạt public mirror một lần

Trong repository private `nhutvo2310/Navimaps-iOS`, tạo Actions secret tên `PUBLIC_RELEASE_TOKEN`.

Token nên là fine-grained personal access token, chỉ cấp quyền cho repository `nhutvo2310/Navimaps` và quyền `Contents: Read and write`. Workflow dùng token này ở GitHub Actions để tạo/cập nhật release `ios-vX.Y.Z` và upload `Navimaps.ipa` cùng checksum.

Secret `GOOGLE_MAPS_API_KEY` vẫn cần tồn tại trong `Navimaps-iOS` vì app hiện dùng Google Maps SDK.

## Quy trình phát hành

1. Cập nhật mã nguồn trong `Navimaps-iOS`.
2. Chạy workflow **Build and release Navimaps iOS**.
3. Nhập `version` dạng `X.Y.Z` và `build_number` là số nguyên dương.
4. Workflow build cho `iphoneos`, kiểm tra metadata và tạo `Navimaps.ipa` chưa ký.
5. Workflow tạo release `ios-vX.Y.Z` trong repo private.
6. Nếu có `PUBLIC_RELEASE_TOKEN`, workflow mirror IPA sang release cùng tag của repo public `Navimaps`.
7. Trang `/ios/` tự tìm phiên bản mới. Không cần sửa link IPA thủ công.

## Cài trên iPhone

Nút **Cài đặt Navimaps** tạo URL theo định dạng SideInstaller hiện công bố:

`https://sideinstaller.net/open.html?url=ENCODED_IPA_URL`

Mỗi người dùng tự ký IPA bằng Apple ID của họ. Website không thu thập Apple ID. Với tài khoản miễn phí, provisioning profile thường có thời hạn 7 ngày và có các giới hạn Personal Team của Apple.

Không dùng mục Legacy Enterprise certificates hoặc chứng chỉ chia sẻ. Luồng phân phối này yêu cầu mỗi người dùng tự ký IPA bằng Apple ID của họ.

