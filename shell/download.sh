if test -t 1; then # if terminal
    ncolors=$(which tput > /dev/null && tput colors) # supports color
    if test -n "$ncolors" && test $ncolors -ge 8; then
        termcols=$(tput cols)
        bold="$(tput bold)"
        underline="$(tput smul)"
        standout="$(tput smso)"
        normal="$(tput sgr0)"
        black="$(tput setaf 0)"
        red="$(tput setaf 1)"
        green="$(tput setaf 2)"
        yellow="$(tput setaf 3)"
        blue="$(tput setaf 4)"
        magenta="$(tput setaf 5)"
        cyan="$(tput setaf 6)"
        white="$(tput setaf 7)"
    fi
fi

if [[ ! ${1} ]]; then
    echo "${red}================================================================================${normal}"
    echo -e "  ${bold}${yellow}not slug${normal}"
    echo "${red}================================================================================${normal}"
    exit 1
fi

localhost="127.0.0.1"
data=$(curl -sLf "http://${localhost}/data?slug=${1}" | jq -r ".")
status=$(echo $data | jq -r ".status")

if [[ $status == "false" ]]; then
    msg=$(echo $data | jq -r ".msg")
    url_cron=$(echo $data | jq -r ".url_cron")
    echo "msg = ${msg}"
    if [[ $msg == "video_error" ]]; then
        e_code=$(echo $data | jq -r ".e_code")
        sleep 1
        curl -sS "http://127.0.0.1/error?slug=${1}&e_code=${e_code}"
    else
        sleep 1
        curl -sS "http://127.0.0.1/cancle?slug=${1}"
    fi
    sleep 1
    #curl -sS "${url_cron}"
    exit 1
fi
type=$(echo $data | jq -r ".type")
root_dir=$(echo $data | jq -r ".root_dir")

sudo bash ${root_dir}/shell/updatepercent.sh > /dev/null &

if [[ $type == "gdrive_quality_done" ]]; then
    echo "${type} done"
    sleep 2
    curl -sS "http://127.0.0.1/success-quality?slug=${1}"
fi

if [[ $type == "gdrive_quality" ]]; then
    echo "download ${type}"
    quality=$(echo $data | jq ".quality | to_entries | .[].value"  --raw-output)
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    cookie=$(echo $data | jq ".cookie"  --raw-output)
    vdo=$(echo $data | jq ".vdo")
    speed=$(echo $data | jq ".speed")
    for qua in $quality
    do
        outPut=${outPutPath}/file_${qua}.mp4
        linkDownload=$(echo $vdo | jq -r ".file_${qua}")
        DownloadTXT="${outPutPath}/file_${qua}.txt"
        
        if [[ -f "$outPut" ]]; then
            rm -rf ${outPut}
        fi
        if [[ -f "$DownloadTXT" ]]; then
            rm -rf ${DownloadTXT}
        fi

        if [ "${cookie}" != "null" ]; then
            echo "download ${qua}"
            curl -sS "http://${localhost}/update/task/downloading?quality=${qua}"
            #run check process
            axel -H "Cookie: ${cookie}" -n ${speed} -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1
        fi
        sleep 2
        echo "download ${qua} > ${outPut}"
        curl -sS "http://${localhost}/remote-quality?slug=${1}&quality=${qua}"
    done
    sleep 2
    curl -sS "http://127.0.0.1/success-quality?slug=${1}"
    #download quality success
    echo "download_gdrive_quality_done"
fi

if [[ $type == "gdrive_default" ]]; then
    echo "download ${type}"
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    outPut="${outPutPath}/file_default"
    linkDownload=$(echo $data | jq -r ".soruce")
    Authorization=$(echo $data | jq -r ".authorization")
    DownloadTXT="${outPutPath}/file_default.txt"
    if [[ -f "$outPut" ]]; then
        rm -rf ${outPut}
    fi
    if [[ -f "$DownloadTXT" ]]; then
        rm -rf ${DownloadTXT}
    fi
    
    curl -sS "http://${localhost}/update/task/downloading?quality=default"
    
    axel -H "Authorization: ${Authorization}" -n 1 -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1

    curl -sS "http://${localhost}/remote?slug=${1}"
    echo "download_${type}_done"
fi

if [[ $type == "link_mp4_default" ]]; then

    echo "download ${type}"
    outPutPath=$(echo $data | jq ".outPutPath"  --raw-output)
    speed=$(echo $data | jq ".speed")
    outPut="${outPutPath}/file_default.mp4"
    linkDownload=$(echo $data | jq -r ".soruce")
    DownloadTXT="${outPutPath}/file_default.txt"
    if [[ -f "$outPut" ]]; then
        rm -rf ${outPut}
    fi
    if [[ -f "$DownloadTXT" ]]; then
        rm -rf ${DownloadTXT}
    fi
    curl -sS "http://${localhost}/update/task/downloading?quality=default"

    axel -n ${speed} -o "${outPut}" "${linkDownload}" >> ${DownloadTXT} 2>&1
    echo "download_${type}_done"
fi
exit 1