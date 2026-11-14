"""HH and HV backscatter in dB from NISAR GCOV, plus differences and the colour composite.

In:  the downloaded GCOV .h5 and the common grid.
Out: PNG layers hh, hv, dhh, dhv, rgb + manifest entries.
Reads: GCOV (linear power HHHH/HVHV; dB = 10*log10(value)).
"""
