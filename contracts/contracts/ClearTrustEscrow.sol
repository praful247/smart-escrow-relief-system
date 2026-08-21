// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClearTrustEscrow {
    address public admin;

    enum VoucherStatus { NOT_CREATED, ISSUED, REDEEMED }

    struct Voucher {
        string voucherHash;
        uint256 amount;
        VoucherStatus status;
        address vendor;
    }

    mapping(string => Voucher) public vouchers;

    event VoucherCreated(string voucherHash, uint256 amount);
    event VoucherRedeemed(string voucherHash, address vendor, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createVoucher(string memory _voucherHash, uint256 _amount) external onlyAdmin {
        require(vouchers[_voucherHash].status == VoucherStatus.NOT_CREATED, "Voucher already exists");
        vouchers[_voucherHash] = Voucher({
            voucherHash: _voucherHash,
            amount: _amount,
            status: VoucherStatus.ISSUED,
            vendor: address(0)
        });
        emit VoucherCreated(_voucherHash, _amount);
    }

    function redeemVoucher(string memory _voucherHash, address _vendor) external onlyAdmin {
        require(vouchers[_voucherHash].status == VoucherStatus.ISSUED, "Voucher not issued or already redeemed");
        
        vouchers[_voucherHash].status = VoucherStatus.REDEEMED;
        vouchers[_voucherHash].vendor = _vendor;
        
        emit VoucherRedeemed(_voucherHash, _vendor, vouchers[_voucherHash].amount);
    }
}
